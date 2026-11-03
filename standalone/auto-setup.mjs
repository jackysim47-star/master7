// Fail-closed preflight for the full MASTER7 platform setup.
// This repository is a service-portal candidate, not the recovered original game platform.
// Preflight is read-only: it never provisions cloud resources, runs migrations, or deploys.
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {cloudReadiness} from './cloud-readiness.mjs';
import {EXPECTED_ORIGINAL_SITE,EXPECTED_V17_SITE,verifyOriginalSourceDirectory,verifyV17SourceDirectory} from './original-source-manifest.mjs';

const SHA256=/^[a-f0-9]{64}$/;
const confirmed=(env,key)=>env[key]==='true';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const RESTORE_CHECKS=['members','staffRoles','walletBalances','openOrders','ledger'];
export async function verifyEvidenceFileHash(filePath,expectedHash,kind){
 const prefix=({backup:'DATA_BACKUP',vendor:'VENDOR_MANIFEST',android:'ANDROID_APP',ios:'IOS_APP'})[kind]||'EVIDENCE';
 if(!SHA256.test(expectedHash||''))return {ok:false,code:`${prefix}_HASH_INVALID`};
 if(typeof filePath!=='string'||!filePath.trim())return {ok:false,code:`${prefix}_PATH_MISSING`};
 let stat;
 try{stat=await lstat(resolve(filePath));if(!stat.isFile()||stat.isSymbolicLink())return {ok:false,code:`${prefix}_FILE_INVALID`};}
 catch{return {ok:false,code:`${prefix}_FILE_MISSING`};}
 const digest=createHash('sha256');
 try{for await(const chunk of createReadStream(resolve(filePath)))digest.update(chunk);}
 catch{return {ok:false,code:`${prefix}_FILE_UNREADABLE`};}
 const actual=digest.digest('hex');
 if(actual!==expectedHash)return {ok:false,code:`${prefix}_HASH_MISMATCH`};
 return {ok:true,sha256:actual};
}
export async function verifyMobileArtifact(filePath,expectedHash,platform){
 const extension=platform==='android'?'.apk':platform==='ios'?'.ipa':null;
 if(!extension)return {ok:false,code:'MOBILE_PLATFORM_INVALID'};
 if(typeof filePath!=='string'||extname(filePath).toLowerCase()!==extension)
  return {ok:false,code:`${platform.toUpperCase()}_APP_FILE_TYPE_INVALID`};
 return verifyEvidenceFileHash(filePath,expectedHash,platform);
}
function hasUniqueIds(rows){
 return Array.isArray(rows)&&rows.length>0&&rows.every(row=>row&&typeof row.id==='string'&&row.id.trim())&&
  new Set(rows.map(row=>row.id)).size===rows.length;
}
function hasExactKeys(value,expected){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const actual=Object.keys(value).sort(),keys=[...expected].sort();
 return actual.length===keys.length&&actual.every((key,index)=>key===keys[index]);
}
function hasOnlyKeys(value,allowed){
 return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key)));
}
export async function verifyCanonicalVendorManifest(filePath,expectedHash){
 const checked=await verifyEvidenceFileHash(filePath,expectedHash,'vendor');
 if(!checked.ok)return checked;
 let bytes;
 try{bytes=await readFile(resolve(filePath));}catch{return {ok:false,code:'VENDOR_MANIFEST_FILE_UNREADABLE'};}
 let manifest;
 try{manifest=JSON.parse(bytes.toString('utf8'));}catch{return {ok:false,code:'VENDOR_MANIFEST_JSON_INVALID'};}
 if(manifest?.schemaVersion!==1||manifest?.kind!=='master7-vendor-manifest'||manifest?.status!=='canonical'||
  !hasUniqueIds(manifest.suppliers)||!hasUniqueIds(manifest.brands)||!hasUniqueIds(manifest.games)||!hasUniqueIds(manifest.paymentMerchants))
  return {ok:false,code:'VENDOR_MANIFEST_STRUCTURE_INVALID'};
 const supplierIds=new Set(manifest.suppliers.map(x=>x.id)),brandIds=new Set(manifest.brands.map(x=>x.id));
 if(manifest.brands.some(x=>!supplierIds.has(x.supplierId))||manifest.games.some(x=>!brandIds.has(x.brandId))||
  manifest.paymentMerchants.some(x=>!supplierIds.has(x.supplierId)))return {ok:false,code:'VENDOR_MANIFEST_REFERENCE_INVALID'};
 return {ok:true,sha256:expectedHash,supplierCount:manifest.suppliers.length,brandCount:manifest.brands.length,
  gameCount:manifest.games.length,paymentMerchantCount:manifest.paymentMerchants.length};
}
export async function verifyIsolatedRestoreReceipt(filePath,expectedBackupHash){
 if(!SHA256.test(expectedBackupHash||''))return {ok:false,code:'RESTORE_RECEIPT_BACKUP_HASH_INVALID'};
 if(typeof filePath!=='string'||!filePath.trim())return {ok:false,code:'RESTORE_RECEIPT_PATH_MISSING'};
 let receipt;
 try{
  const path=resolve(filePath),stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink())return {ok:false,code:'RESTORE_RECEIPT_FILE_INVALID'};
  receipt=JSON.parse(await readFile(path,'utf8'));
 }catch{return {ok:false,code:'RESTORE_RECEIPT_FILE_INVALID'};}
 if(!hasExactKeys(receipt,['schemaVersion','kind','status','target','backupSha256','restoredAt','checks'])||
  receipt?.schemaVersion!==1||receipt?.kind!=='master7-isolated-restore-receipt'||receipt?.status!=='verified'||
  receipt?.target!=='isolated'||receipt?.backupSha256!==expectedBackupHash||
  typeof receipt?.restoredAt!=='string'||!Number.isFinite(Date.parse(receipt.restoredAt))||
  !hasOnlyKeys(receipt.checks,RESTORE_CHECKS))
  return {ok:false,code:'RESTORE_RECEIPT_STRUCTURE_INVALID'};
 for(const name of RESTORE_CHECKS){
  const check=receipt.checks[name];
  if(check===undefined)return {ok:false,code:'RESTORE_RECEIPT_CHECKS_INCOMPLETE'};
  if(!hasExactKeys(check,['passed','recordsChecked']))return {ok:false,code:'RESTORE_RECEIPT_UNEXPECTED_FIELDS'};
  if(!check||check.passed!==true||!Number.isSafeInteger(check.recordsChecked)||check.recordsChecked<0)
   return {ok:false,code:'RESTORE_RECEIPT_CHECKS_INCOMPLETE'};
 }
 return {ok:true,backupSha256:expectedBackupHash,restoredAt:receipt.restoredAt,
  checks:Object.fromEntries(RESTORE_CHECKS.map(name=>[name,{passed:true,recordsChecked:receipt.checks[name].recordsChecked}]))};
}
function httpsOrigin(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null;}
 catch{return null;}
}

export async function autoSetupReadiness({target='staging',env=process.env,sourceDir=env.MASTER7_ORIGINAL_SOURCE_DIR||resolve('original-platform'),
 v17SourceDir=env.MASTER7_V17_SOURCE_DIR||resolve('v17-platform'),
 vendorManifestPath=env.MASTER7_VENDOR_MANIFEST_PATH||''}={}){
 if(!['staging','production'].includes(target))throw Error('Target must be staging or production.');
 const checks=[];
 const add=(code,ok)=>checks.push({code,ok:Boolean(ok)});

 // Never let a similarly named portal or a test snapshot stand in for the original game platform.
 const originalSource=await verifyOriginalSourceDirectory(sourceDir);
 // V17 is the target base. Verify it separately from v105, which remains the legacy source/mapping evidence.
 const v17Source=await verifyV17SourceDirectory(v17SourceDir);
 const dataBackup=await verifyEvidenceFileHash(env.MASTER7_DATA_BACKUP_PATH,env.MASTER7_DATA_BACKUP_SHA256,'backup');
 const dataRestore=dataBackup.ok?await verifyIsolatedRestoreReceipt(env.MASTER7_DATA_RESTORE_RECEIPT_PATH,dataBackup.sha256):
  {ok:false,code:'RESTORE_RECEIPT_BACKUP_NOT_VERIFIED'};
 add('ORIGINAL_PROJECT_ID',originalSource.projectId===EXPECTED_ORIGINAL_SITE.projectId);
 add('ORIGINAL_SOURCE_ACCESS',confirmed(env,'MASTER7_ORIGINAL_SOURCE_ACCESS_CONFIRMED'));
 add('ORIGINAL_GAME_SOURCE_IN_THIS_REPOSITORY',originalSource.ok);
 add('V17_TARGET_PROJECT_ID',v17Source.projectId===EXPECTED_V17_SITE.projectId);
 add('V17_TARGET_SOURCE_ACCESS',confirmed(env,'MASTER7_V17_SOURCE_ACCESS_CONFIRMED'));
 add('V17_TARGET_SOURCE_IN_THIS_REPOSITORY',v17Source.ok);
 add('DATA_BACKUP_SHA256',dataBackup.ok);
 add('ISOLATED_DATA_RESTORE',dataRestore.ok);
 const vendorManifest=await verifyCanonicalVendorManifest(vendorManifestPath,env.MASTER7_VENDOR_MANIFEST_SHA256);
 add('CANONICAL_VENDOR_MANIFEST_SHA256',vendorManifest.ok);
 const androidApp=await verifyMobileArtifact(env.MASTER7_ANDROID_APP_PATH,env.MASTER7_ANDROID_APP_SHA256,'android');
 const iosApp=await verifyMobileArtifact(env.MASTER7_IOS_APP_PATH,env.MASTER7_IOS_APP_SHA256,'ios');
 add('ANDROID_INSTALLABLE_APP_SHA256',androidApp.ok);
 add('ANDROID_APP_SIGNATURE',confirmed(env,'MASTER7_ANDROID_APP_SIGNATURE_VERIFIED'));
 add('ANDROID_APP_DEVICE_UAT',confirmed(env,'MASTER7_ANDROID_APP_DEVICE_UAT_CONFIRMED'));
 add('IOS_INSTALLABLE_APP_SHA256',iosApp.ok);
 add('IOS_APP_SIGNATURE',confirmed(env,'MASTER7_IOS_APP_SIGNATURE_VERIFIED'));
 add('IOS_APP_DEVICE_UAT',confirmed(env,'MASTER7_IOS_APP_DEVICE_UAT_CONFIRMED'));

 const cloud=cloudReadiness(env);
 add('HTTPS_ORIGIN',cloud.configuration.find(x=>x.code==='HTTPS_ORIGIN')?.ok);
 add('PUBLIC_BIND_ADDRESS',cloud.configuration.find(x=>x.code==='PUBLIC_BIND_ADDRESS')?.ok);
 add('STAGING_POSTGRES_CONFIGURATION',cloud.configuration.find(x=>x.code==='POSTGRES_CONFIGURATION')?.ok);
 add('SERVICE_ONLY_GUARD',cloud.configuration.find(x=>x.code==='SERVICE_ONLY_GUARD')?.ok);
 add('TRANSACTION_SWITCHES_OFF',cloud.configuration.find(x=>x.code==='TRANSACTION_SWITCHES_OFF')?.ok);

 const stagingCustomer=httpsOrigin(env.MASTER7_STAGING_CUSTOMER_ORIGIN);
 const stagingAdmin=httpsOrigin(env.MASTER7_STAGING_ADMIN_ORIGIN);
 add('STAGING_TWO_ENTRYPOINTS',Boolean(stagingCustomer&&stagingAdmin&&stagingCustomer!==stagingAdmin&&
  new URL(stagingCustomer).hostname!==new URL(stagingAdmin).hostname&&
  !['www.master7.best','admin.master7.best'].includes(new URL(stagingCustomer).hostname)&&
  !['www.master7.best','admin.master7.best'].includes(new URL(stagingAdmin).hostname)));
 add('CUSTOMER_SMS_OTP_UAT',confirmed(env,'MASTER7_CUSTOMER_SMS_OTP_UAT_CONFIRMED'));
 add('SHARED_ADMIN_ROLE_UAT',confirmed(env,'MASTER7_SHARED_ADMIN_ROLE_UAT_CONFIRMED'));

 if(target==='production'){
  add('PRODUCTION_TWO_ENTRYPOINTS',httpsOrigin(env.MASTER7_CUSTOMER_ORIGIN)==='https://www.master7.best'&&
   httpsOrigin(env.MASTER7_ADMIN_ORIGIN)==='https://admin.master7.best');
  add('VENDOR_UAT_ACCEPTANCE',confirmed(env,'MASTER7_VENDOR_UAT_CONFIRMED'));
  add('OPERATING_LICENSE_AND_CONTRACTS',confirmed(env,'MASTER7_LICENSE_AND_CONTRACTS_CONFIRMED'));
  add('DOMAIN_OWNERSHIP',confirmed(env,'MASTER7_DOMAIN_OWNERSHIP_CONFIRMED'));
  add('RESTORE_AND_ROLLBACK_TEST',confirmed(env,'MASTER7_ROLLBACK_TEST_CONFIRMED'));
  add('SOLE_OWNER_ACCESS',confirmed(env,'MASTER7_SOLE_OWNER_ACCESS_CONFIRMED'));
  add('FINAL_RELEASE_APPROVAL',confirmed(env,'MASTER7_FINAL_RELEASE_APPROVED'));
  add('ANDROID_PRODUCTION_APP_INSTALL',confirmed(env,'MASTER7_ANDROID_PRODUCTION_APP_INSTALL_CONFIRMED'));
  add('IOS_PRODUCTION_APP_INSTALL',confirmed(env,'MASTER7_IOS_PRODUCTION_APP_INSTALL_CONFIRMED'));
 }

 const blockers=checks.filter(x=>!x.ok).map(x=>x.code);
 return {
  target,
  mode:'read_only_preflight',
  ready:blockers.length===0,
  canProvision:false,
  originalSource:originalSource.ok?{verified:true,projectId:originalSource.projectId,versionNumber:originalSource.versionNumber,
   sourceCommit:originalSource.sourceCommit,fileCount:originalSource.fileCount,rootSha256:originalSource.rootSha256}:
   {verified:false,code:originalSource.code},
  targetSource:v17Source.ok?{verified:true,projectId:v17Source.projectId,versionNumber:v17Source.versionNumber,
   sourceCommit:v17Source.sourceCommit,fileCount:v17Source.fileCount,rootSha256:v17Source.rootSha256}:
   {verified:false,code:v17Source.code},
  mobileApps:{android:androidApp.ok?{verified:true,sha256:androidApp.sha256}:{verified:false,code:androidApp.code},
   ios:iosApp.ok?{verified:true,sha256:iosApp.sha256}:{verified:false,code:iosApp.code}},
  vendorManifest:vendorManifest.ok?{verified:true,sha256:vendorManifest.sha256,supplierCount:vendorManifest.supplierCount,
   brandCount:vendorManifest.brandCount,gameCount:vendorManifest.gameCount,paymentMerchantCount:vendorManifest.paymentMerchantCount}:
   {verified:false,code:vendorManifest.code},
  dataBackup:dataBackup.ok?{verified:true,sha256:dataBackup.sha256}:{verified:false,code:dataBackup.code},
  dataRestore:dataRestore.ok?{verified:true,backupSha256:dataRestore.backupSha256,restoredAt:dataRestore.restoredAt,
   checks:dataRestore.checks}:{verified:false,code:dataRestore.code},
  checks,
  blockers,
  limitations:[
   'This command performs no cloud mutation, migration, DNS change or deployment.',
   'The current repository contains a service-portal candidate, not the verified original game-platform source.',
   'V17 target source and v105 legacy source are separate required inputs; a portal snapshot cannot stand in for either.',
   'The source manifest verifies file integrity and expected release identifiers; source ownership must still be confirmed independently.',
   'Mobile artifact SHA-256 is checked locally; signature and device-UAT flags are attestations that require independent platform-side verification.',
   'Configuration presence and evidence flags do not replace independent backup, ownership, license or supplier verification.',
  ],
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const {values}=parseArgs({options:{target:{type:'string',default:'staging'},'source-dir':{type:'string'},'v17-source-dir':{type:'string'}},strict:true});
  const report=await autoSetupReadiness({target:values.target,
   sourceDir:values['source-dir']||process.env.MASTER7_ORIGINAL_SOURCE_DIR||resolve('original-platform'),
   v17SourceDir:values['v17-source-dir']||process.env.MASTER7_V17_SOURCE_DIR||resolve('v17-platform')});
  console.log(JSON.stringify(report,null,2));
  if(!report.ready)process.exitCode=1;
 }catch{
  console.error('Use npm run setup:auto:preflight -- --target staging|production [--source-dir PATH] [--v17-source-dir PATH]. No cloud changes are made.');
  process.exitCode=2;
 }
}
