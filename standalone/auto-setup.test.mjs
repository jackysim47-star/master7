import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {autoSetupReadiness,verifyCanonicalVendorManifest,verifyEvidenceFileHash,verifyIsolatedRestoreReceipt,verifyMobileArtifact} from './auto-setup.mjs';
import {createOriginalSourceManifest,createV17SourceManifest,EXPECTED_ORIGINAL_SITE,EXPECTED_V17_SITE,SOURCE_MANIFEST_NAME,V17_SOURCE_MANIFEST_NAME,sourceManifestRootHash,verifyOriginalSourceDirectory,verifyV17SourceDirectory} from './original-source-manifest.mjs';

const fakeHash='a'.repeat(64);
const readyConfiguration={
 NODE_ENV:'production',PUBLIC_ORIGIN:'https://staging.example.test',
 MASTER7_STAGING_CUSTOMER_ORIGIN:'https://m7-customer-staging.example.test',
 MASTER7_STAGING_ADMIN_ORIGIN:'https://m7-admin-staging.example.test',
 PORTAL_POSTGRES_URL:'postgresql://synthetic:do-not-print@db.example.test/staging',
 MASTER7_ORIGINAL_SOURCE_ACCESS_CONFIRMED:'true',
 MASTER7_V17_SOURCE_ACCESS_CONFIRMED:'true',
 MASTER7_DATA_BACKUP_SHA256:fakeHash,
 MASTER7_VENDOR_MANIFEST_SHA256:fakeHash,
 MASTER7_CUSTOMER_SMS_OTP_UAT_CONFIRMED:'true',MASTER7_SHARED_ADMIN_ROLE_UAT_CONFIRMED:'true',
};
const sha=value=>createHash('sha256').update(value).digest('hex');

async function sourceFixture(t,{identity=EXPECTED_ORIGINAL_SITE,manifestName=SOURCE_MANIFEST_NAME,files={'README.md':'verified source fixture'}}={}){
 const root=await mkdtemp(join(tmpdir(),'master7-original-source-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const entries=[];
 for(const [path,contents] of Object.entries(files)){
  const dest=join(root,path);await mkdir(join(dest,'..'),{recursive:true});await writeFile(dest,contents);
  const bytes=Buffer.from(contents);entries.push({path,bytes:bytes.length,sha256:sha(bytes)});
 }
 const manifest={schemaVersion:1,projectId:identity.projectId,versionNumber:identity.versionNumber,
  sourceCommit:identity.sourceCommit,files:entries,rootSha256:sourceManifestRootHash(entries)};
 await writeFile(join(root,manifestName),JSON.stringify(manifest));
 return root;
}
const v17SourceFixture=(t,options={})=>sourceFixture(t,{identity:EXPECTED_V17_SITE,manifestName:V17_SOURCE_MANIFEST_NAME,...options});

async function vendorFixture(t,manifest={schemaVersion:1,kind:'master7-vendor-manifest',status:'canonical',
 suppliers:[{id:'supplier-1'}],brands:[{id:'brand-1',supplierId:'supplier-1'}],
 games:[{id:'game-1',brandId:'brand-1'}],paymentMerchants:[{id:'merchant-1',supplierId:'supplier-1'}]}){
 const root=await mkdtemp(join(tmpdir(),'master7-vendors-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const path=join(root,'vendors.json'),bytes=JSON.stringify(manifest);
 await writeFile(path,bytes);
 return {path,hash:sha(bytes)};
}
async function backupFixture(t,contents='synthetic backup bytes'){
 const root=await mkdtemp(join(tmpdir(),'master7-backup-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const path=join(root,'backup.dump');await writeFile(path,contents);return {path,hash:sha(contents)};
}
async function mobileFixtures(t){
 const root=await mkdtemp(join(tmpdir(),'master7-mobile-release-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const androidPath=join(root,'master7.apk'),iosPath=join(root,'master7.ipa');
 const android='synthetic signed Android artifact fixture',ios='synthetic signed iOS artifact fixture';
 await writeFile(androidPath,android);await writeFile(iosPath,ios);
 return {MASTER7_ANDROID_APP_PATH:androidPath,MASTER7_ANDROID_APP_SHA256:sha(android),
  MASTER7_ANDROID_APP_SIGNATURE_VERIFIED:'true',MASTER7_ANDROID_APP_DEVICE_UAT_CONFIRMED:'true',
  MASTER7_IOS_APP_PATH:iosPath,MASTER7_IOS_APP_SHA256:sha(ios),
  MASTER7_IOS_APP_SIGNATURE_VERIFIED:'true',MASTER7_IOS_APP_DEVICE_UAT_CONFIRMED:'true',
  MASTER7_ANDROID_PRODUCTION_APP_INSTALL_CONFIRMED:'true',MASTER7_IOS_PRODUCTION_APP_INSTALL_CONFIRMED:'true'};
}
async function restoreReceiptFixture(t,backupSha256){
 const root=await mkdtemp(join(tmpdir(),'master7-restore-receipt-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const path=join(root,'restore-receipt.json');
 const checks=Object.fromEntries(['members','staffRoles','walletBalances','openOrders','ledger'].map(name=>[name,{passed:true,recordsChecked:1}]));
 await writeFile(path,JSON.stringify({schemaVersion:1,kind:'master7-isolated-restore-receipt',status:'verified',target:'isolated',
  backupSha256,restoredAt:'2026-11-03T12:00:00.000Z',checks}));
 return path;
}

test('current portal-only checkout remains blocked when a source receipt is absent',async()=>{
 const report=await autoSetupReadiness({target:'staging',env:readyConfiguration,sourceDir:join(tmpdir(),'not-a-master7-source')});
 assert.equal(report.mode,'read_only_preflight');assert.equal(report.ready,false);assert.equal(report.canProvision,false);
 assert(report.blockers.includes('ORIGINAL_PROJECT_ID'));
 assert(report.blockers.includes('ORIGINAL_GAME_SOURCE_IN_THIS_REPOSITORY'));
 assert.equal(report.originalSource.verified,false);
 assert(!JSON.stringify(report).includes('do-not-print'));
 assert(!JSON.stringify(report).includes('db.example.test'));
});

test('a byte-verified v105 source manifest can satisfy source checks but preflight never deploys',async t=>{
 const sourceDir=await sourceFixture(t);
 const v17SourceDir=await v17SourceFixture(t);
 const vendor=await vendorFixture(t);
 const backup=await backupFixture(t);
 const mobile=await mobileFixtures(t);
 const restoreReceiptPath=await restoreReceiptFixture(t,backup.hash);
 const report=await autoSetupReadiness({target:'staging',sourceDir,v17SourceDir,env:{...readyConfiguration,...mobile,MASTER7_VENDOR_MANIFEST_PATH:vendor.path,
  MASTER7_VENDOR_MANIFEST_SHA256:vendor.hash,MASTER7_DATA_BACKUP_PATH:backup.path,MASTER7_DATA_BACKUP_SHA256:backup.hash,
  MASTER7_DATA_RESTORE_RECEIPT_PATH:restoreReceiptPath},sourceDir});
 assert.equal(report.originalSource.verified,true);
 assert.equal(report.originalSource.projectId,EXPECTED_ORIGINAL_SITE.projectId);
 assert.equal(report.originalSource.versionNumber,105);
 assert.equal(report.targetSource.verified,true);
 assert.equal(report.targetSource.projectId,EXPECTED_V17_SITE.projectId);
 assert.equal(report.targetSource.versionNumber,9);
 assert.equal(report.vendorManifest.verified,true);
 assert.equal(report.dataBackup.verified,true);
 assert.equal(report.dataRestore.verified,true);
 assert.equal(report.mobileApps.android.verified,true);
 assert.equal(report.mobileApps.ios.verified,true);
 assert.equal(report.ready,true);assert.equal(report.canProvision,false);
});

test('V17 target source is independently pinned and required alongside v105 migration source',async t=>{
 const sourceDir=await sourceFixture(t),v17SourceDir=await v17SourceFixture(t);
 assert.equal((await verifyV17SourceDirectory(v17SourceDir)).sourceCommit,EXPECTED_V17_SITE.sourceCommit);
 const good=await autoSetupReadiness({sourceDir,v17SourceDir,env:readyConfiguration});
 assert.equal(good.checks.find(x=>x.code==='V17_TARGET_SOURCE_IN_THIS_REPOSITORY').ok,true);
 const missing=await autoSetupReadiness({sourceDir,env:readyConfiguration});
 assert(missing.blockers.includes('V17_TARGET_SOURCE_IN_THIS_REPOSITORY'));
 const wrong=await v17SourceFixture(t,{identity:{...EXPECTED_V17_SITE,sourceCommit:'0'.repeat(40)}});
 const rejected=await autoSetupReadiness({sourceDir,v17SourceDir:wrong,env:readyConfiguration});
 assert.equal(rejected.targetSource.code,'SOURCE_IDENTITY_MISMATCH');
});

test('backup hash must match a local regular file, not merely look like SHA-256',async t=>{
 const backup=await backupFixture(t);
 assert.equal((await verifyEvidenceFileHash(backup.path,backup.hash,'backup')).ok,true);
 assert.equal((await verifyEvidenceFileHash(backup.path,'a'.repeat(64),'backup')).code,'DATA_BACKUP_HASH_MISMATCH');
 assert.equal((await verifyEvidenceFileHash('',backup.hash,'backup')).code,'DATA_BACKUP_PATH_MISSING');
});

test('mobile app artifacts require real APK and IPA files whose bytes match their hashes',async t=>{
 const mobile=await mobileFixtures(t);
 assert.equal((await verifyMobileArtifact(mobile.MASTER7_ANDROID_APP_PATH,mobile.MASTER7_ANDROID_APP_SHA256,'android')).ok,true);
 assert.equal((await verifyMobileArtifact(mobile.MASTER7_IOS_APP_PATH,mobile.MASTER7_IOS_APP_SHA256,'ios')).ok,true);
 assert.equal((await verifyMobileArtifact(mobile.MASTER7_ANDROID_APP_PATH,'0'.repeat(64),'android')).code,'ANDROID_APP_HASH_MISMATCH');
 assert.equal((await verifyMobileArtifact(mobile.MASTER7_ANDROID_APP_PATH,mobile.MASTER7_ANDROID_APP_SHA256,'ios')).code,'IOS_APP_FILE_TYPE_INVALID');
});

test('isolated restore requires a receipt tied to the verified backup and all reconciliation checks',async t=>{
 const backup=await backupFixture(t),receiptPath=await restoreReceiptFixture(t,backup.hash);
 assert.equal((await verifyIsolatedRestoreReceipt(receiptPath,backup.hash)).ok,true);
 assert.equal((await verifyIsolatedRestoreReceipt(receiptPath,'a'.repeat(64))).code,'RESTORE_RECEIPT_STRUCTURE_INVALID');
 const receipt=JSON.parse(await (await import('node:fs/promises')).readFile(receiptPath,'utf8'));
 delete receipt.checks.ledger;
 const malformed=join(receiptPath,'..','incomplete.json');await writeFile(malformed,JSON.stringify(receipt));
 assert.equal((await verifyIsolatedRestoreReceipt(malformed,backup.hash)).code,'RESTORE_RECEIPT_CHECKS_INCOMPLETE');
 const withMemberData=join(receiptPath,'..','member-data.json');
 const complete=JSON.parse(await (await import('node:fs/promises')).readFile(receiptPath,'utf8'));
 complete.memberRecords=[{memberId:'must-not-be-in-receipt'}];await writeFile(withMemberData,JSON.stringify(complete));
 assert.equal((await verifyIsolatedRestoreReceipt(withMemberData,backup.hash)).code,'RESTORE_RECEIPT_STRUCTURE_INVALID');
 const nestedMemberData=join(receiptPath,'..','nested-member-data.json');
 delete complete.memberRecords;
 complete.checks.members.sampleMemberId='must-not-be-in-receipt';await writeFile(nestedMemberData,JSON.stringify(complete));
 assert.equal((await verifyIsolatedRestoreReceipt(nestedMemberData,backup.hash)).code,'RESTORE_RECEIPT_UNEXPECTED_FIELDS');
});

test('vendor manifest hash, canonical status, unique IDs and references are verified',async t=>{
 const valid=await vendorFixture(t);
 assert.equal((await verifyCanonicalVendorManifest(valid.path,valid.hash)).ok,true);
 assert.equal((await verifyCanonicalVendorManifest(valid.path,'a'.repeat(64))).code,'VENDOR_MANIFEST_HASH_MISMATCH');
 const duplicate=await vendorFixture(t,{schemaVersion:1,kind:'master7-vendor-manifest',status:'canonical',
  suppliers:[{id:'supplier-1'},{id:'supplier-1'}],brands:[{id:'brand-1',supplierId:'supplier-1'}],
  games:[{id:'game-1',brandId:'brand-1'}],paymentMerchants:[{id:'merchant-1',supplierId:'supplier-1'}]});
 assert.equal((await verifyCanonicalVendorManifest(duplicate.path,duplicate.hash)).code,'VENDOR_MANIFEST_STRUCTURE_INVALID');
 const provisional=await vendorFixture(t,{schemaVersion:1,kind:'master7-vendor-manifest',status:'candidate',
  suppliers:[{id:'supplier-1'}],brands:[{id:'brand-1',supplierId:'supplier-1'}],games:[{id:'game-1',brandId:'brand-1'}],
  paymentMerchants:[{id:'merchant-1',supplierId:'supplier-1'}]});
 assert.equal((await verifyCanonicalVendorManifest(provisional.path,provisional.hash)).code,'VENDOR_MANIFEST_STRUCTURE_INVALID');
 const brokenRef=await vendorFixture(t,{schemaVersion:1,kind:'master7-vendor-manifest',status:'canonical',
  suppliers:[{id:'supplier-1'}],brands:[{id:'brand-1',supplierId:'missing'}],games:[{id:'game-1',brandId:'brand-1'}],
  paymentMerchants:[{id:'merchant-1',supplierId:'supplier-1'}]});
 assert.equal((await verifyCanonicalVendorManifest(brokenRef.path,brokenRef.hash)).code,'VENDOR_MANIFEST_REFERENCE_INVALID');
});

test('source manifest generation hashes a confirmed export and refuses overwrite',async t=>{
 const root=await mkdtemp(join(tmpdir(),'master7-export-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'index.html'),'<main>export fixture</main>');
 const generated=await createOriginalSourceManifest(root);
 assert.equal(generated.projectId,EXPECTED_ORIGINAL_SITE.projectId);
 assert.equal((await verifyOriginalSourceDirectory(root)).ok,true);
 await assert.rejects(createOriginalSourceManifest(root),/SOURCE_MANIFEST_ALREADY_EXISTS/);
});

test('V17 source manifest hashes the target archive without standing in for owner access',async t=>{
 const root=await mkdtemp(join(tmpdir(),'master7-v17-export-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'README.md'),'V17 source fixture');
 const generated=await createV17SourceManifest(root);
 assert.equal(generated.projectId,EXPECTED_V17_SITE.projectId);
 assert.equal((await verifyV17SourceDirectory(root)).ok,true);
 await assert.rejects(createV17SourceManifest(root),/SOURCE_MANIFEST_ALREADY_EXISTS/);
});

test('source identity, per-file bytes, complete file set and symlinks are checked',async t=>{
 const wrong=await sourceFixture(t,{identity:{...EXPECTED_ORIGINAL_SITE,sourceCommit:'0'.repeat(40)}});
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:wrong})).originalSource.code,'SOURCE_IDENTITY_MISMATCH');
 const changed=await sourceFixture(t);
 await writeFile(join(changed,'README.md'),'tampered');
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:changed})).originalSource.code,'SOURCE_FILE_MISMATCH');
 const extra=await sourceFixture(t);
 await writeFile(join(extra,'unlisted.txt'),'unexpected');
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:extra})).originalSource.code,'SOURCE_FILE_SET_MISMATCH');
 const traversal=await sourceFixture(t);
 const traversalManifest=JSON.parse(await (await import('node:fs/promises')).readFile(join(traversal,SOURCE_MANIFEST_NAME),'utf8'));
 traversalManifest.files[0].path='../outside.txt';
 await writeFile(join(traversal,SOURCE_MANIFEST_NAME),JSON.stringify(traversalManifest));
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:traversal})).originalSource.code,'SOURCE_MANIFEST_INVALID');
 const wrongRoot=await sourceFixture(t);
 const wrongRootManifest=JSON.parse(await (await import('node:fs/promises')).readFile(join(wrongRoot,SOURCE_MANIFEST_NAME),'utf8'));
 wrongRootManifest.rootSha256='f'.repeat(64);
 await writeFile(join(wrongRoot,SOURCE_MANIFEST_NAME),JSON.stringify(wrongRootManifest));
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:wrongRoot})).originalSource.code,'SOURCE_ROOT_HASH_MISMATCH');
 const symlink=await sourceFixture(t);
 await writeFile(join(symlink,'target.txt'),'target');
 await (await import('node:fs/promises')).symlink(join(symlink,'target.txt'),join(symlink,'link.txt'));
 assert.equal((await autoSetupReadiness({env:readyConfiguration,sourceDir:symlink})).originalSource.code,'SOURCE_SYMLINK_UNSUPPORTED');
});

test('missing data, supplier and cloud evidence remain stable blockers',async()=>{
 const report=await autoSetupReadiness({target:'staging',env:{}});
 for(const code of ['ORIGINAL_PROJECT_ID','ORIGINAL_SOURCE_ACCESS','ORIGINAL_GAME_SOURCE_IN_THIS_REPOSITORY',
  'V17_TARGET_PROJECT_ID','V17_TARGET_SOURCE_ACCESS','V17_TARGET_SOURCE_IN_THIS_REPOSITORY',
  'ANDROID_INSTALLABLE_APP_SHA256','ANDROID_APP_SIGNATURE','ANDROID_APP_DEVICE_UAT',
  'IOS_INSTALLABLE_APP_SHA256','IOS_APP_SIGNATURE','IOS_APP_DEVICE_UAT',
  'DATA_BACKUP_SHA256','ISOLATED_DATA_RESTORE','CANONICAL_VENDOR_MANIFEST_SHA256',
  'HTTPS_ORIGIN','STAGING_POSTGRES_CONFIGURATION','STAGING_TWO_ENTRYPOINTS','CUSTOMER_SMS_OTP_UAT',
  'SHARED_ADMIN_ROLE_UAT'])assert(report.blockers.includes(code),code);
 assert.equal(report.checks.find(x=>x.code==='PUBLIC_BIND_ADDRESS').ok,true);
 assert.equal(report.checks.find(x=>x.code==='SERVICE_ONLY_GUARD').ok,true);
 assert.equal(report.checks.find(x=>x.code==='TRANSACTION_SWITCHES_OFF').ok,true);
});

test('staging preflight catches a loopback-only public service binding',async t=>{
 const sourceDir=await sourceFixture(t);
 const report=await autoSetupReadiness({sourceDir,env:{...readyConfiguration,HOST:'127.0.0.1'}});
 assert(report.blockers.includes('PUBLIC_BIND_ADDRESS'));
});

test('staging entrypoints require distinct HTTPS hosts and production origins are fixed',async t=>{
 const sourceDir=await sourceFixture(t);
 const badStaging=await autoSetupReadiness({sourceDir,env:{...readyConfiguration,
  MASTER7_STAGING_ADMIN_ORIGIN:'http://m7-admin-staging.example.test'}});
 assert(badStaging.blockers.includes('STAGING_TWO_ENTRYPOINTS'));
 const reusedProduction=await autoSetupReadiness({target:'production',sourceDir,env:{...readyConfiguration,
  MASTER7_CUSTOMER_ORIGIN:'https://www.master7.vip',MASTER7_ADMIN_ORIGIN:'https://www.master7.vip'}});
 assert(reusedProduction.blockers.includes('PRODUCTION_TWO_ENTRYPOINTS'));
 const wrongAdmin=await autoSetupReadiness({target:'production',sourceDir,env:{...readyConfiguration,
  MASTER7_CUSTOMER_ORIGIN:'https://www.master7.vip',MASTER7_ADMIN_ORIGIN:'https://www.master7.admin'}});
 assert(wrongAdmin.blockers.includes('PRODUCTION_TWO_ENTRYPOINTS'));
});

test('production additionally requires UAT, legal, domain, rollback and sole-owner evidence',async t=>{
 const sourceDir=await sourceFixture(t);
 const report=await autoSetupReadiness({target:'production',env:readyConfiguration,sourceDir});
 for(const code of ['PRODUCTION_TWO_ENTRYPOINTS','VENDOR_UAT_ACCEPTANCE','OPERATING_LICENSE_AND_CONTRACTS','DOMAIN_OWNERSHIP',
  'RESTORE_AND_ROLLBACK_TEST','SOLE_OWNER_ACCESS','FINAL_RELEASE_APPROVAL','ANDROID_PRODUCTION_APP_INSTALL','IOS_PRODUCTION_APP_INSTALL'])assert(report.blockers.includes(code),code);
 assert.equal(report.canProvision,false);
});

test('invalid targets are rejected without exposing environment values',async()=>{
 await assert.rejects(autoSetupReadiness({target:'development',env:{PORTAL_POSTGRES_URL:'not-for-output'}}),/Target must be staging or production/);
});
