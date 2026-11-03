import {createHash} from 'node:crypto';
import {lstat,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

export const EXPECTED_ORIGINAL_SITE=Object.freeze({
 projectId:'appgprj_6abcd530747c81918fb5411fc42b24b3',
 versionNumber:105,
 sourceCommit:'2900208311c747f83886f391a6c990b12001e58c',
});
// Current V17 Sites project is the target base, not proof of the complete old game platform.
export const EXPECTED_V17_SITE=Object.freeze({
 projectId:'appgprj_6ae447787f1c819193237856fd58b858',
 versionNumber:9,
 sourceCommit:'295af6bc29fca1ff3521e5749b9cb241326bed66',
});
export const SOURCE_MANIFEST_NAME='MASTER7_SOURCE_MANIFEST.json';
export const V17_SOURCE_MANIFEST_NAME='MASTER7_V17_SOURCE_MANIFEST.json';
const SHA256=/^[a-f0-9]{64}$/;
const ignoredDirectories=new Set(['.git','node_modules']);

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const safePath=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.startsWith('/')&&
 !value.split('/').some(part=>!part||part==='.'||part==='..');

async function sourceFiles(root,manifestName=SOURCE_MANIFEST_NAME){
 const found=[];
 async function visit(directory,prefix=''){
  for(const item of await readdir(directory,{withFileTypes:true})){
   if(!prefix&&ignoredDirectories.has(item.name))continue;
   const rel=prefix?`${prefix}/${item.name}`:item.name,path=join(directory,item.name);
   const stat=await lstat(path);
   if(stat.isSymbolicLink())throw Error('SOURCE_SYMLINK_UNSUPPORTED');
   if(stat.isDirectory())await visit(path,rel);
   else if(stat.isFile()){if(rel!==manifestName)found.push(rel);}
   else throw Error('SOURCE_FILE_TYPE_UNSUPPORTED');
  }
 }
 await visit(root);
 return found.sort();
}

export async function verifySourceDirectory(sourceDir,{expected=EXPECTED_ORIGINAL_SITE,manifestName=SOURCE_MANIFEST_NAME}={}){
 const fail=code=>({ok:false,code});
 if(typeof sourceDir!=='string'||!sourceDir.trim())return fail('SOURCE_DIR_MISSING');
 const root=resolve(sourceDir);
 try{if(!(await lstat(root)).isDirectory())return fail('SOURCE_DIR_INVALID');}
 catch{return fail('SOURCE_DIR_MISSING');}
 let manifest;
 try{manifest=JSON.parse(await readFile(join(root,manifestName),'utf8'));}
 catch{return fail('SOURCE_MANIFEST_INVALID');}
 if(manifest?.schemaVersion!==1||manifest.projectId!==expected.projectId||
    manifest.versionNumber!==expected.versionNumber||manifest.sourceCommit!==expected.sourceCommit)
  return fail('SOURCE_IDENTITY_MISMATCH');
 if(!Array.isArray(manifest.files)||manifest.files.length<1||!SHA256.test(manifest.rootSha256||''))return fail('SOURCE_MANIFEST_INVALID');
 const entries=new Map();
 for(const entry of manifest.files){
  if(!entry||!safePath(entry.path)||entry.path===SOURCE_MANIFEST_NAME||!Number.isSafeInteger(entry.bytes)||entry.bytes<0||
   !SHA256.test(entry.sha256||'')||entries.has(entry.path))return fail('SOURCE_MANIFEST_INVALID');
  entries.set(entry.path,entry);
 }
 let actualPaths;
 try{actualPaths=await sourceFiles(root,manifestName);}catch(error){return fail(error instanceof Error&&error.message==='SOURCE_SYMLINK_UNSUPPORTED'?'SOURCE_SYMLINK_UNSUPPORTED':'SOURCE_FILE_TYPE_UNSUPPORTED');}
 if(actualPaths.length!==entries.size||actualPaths.some(path=>!entries.has(path)))return fail('SOURCE_FILE_SET_MISMATCH');
 const canonical=[];
 for(const path of actualPaths){
  const entry=entries.get(path),bytes=await readFile(join(root,path));
  if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)return fail('SOURCE_FILE_MISMATCH');
  canonical.push(`${path}\0${bytes.length}\0${entry.sha256}\n`);
 }
 if(hash(Buffer.from(canonical.join(''),'utf8'))!==manifest.rootSha256)return fail('SOURCE_ROOT_HASH_MISMATCH');
 return {ok:true,code:'SOURCE_MANIFEST_VERIFIED',projectId:manifest.projectId,versionNumber:manifest.versionNumber,
  sourceCommit:manifest.sourceCommit,fileCount:actualPaths.length,rootSha256:manifest.rootSha256};
}

export async function verifyOriginalSourceDirectory(sourceDir){
 return verifySourceDirectory(sourceDir,{expected:EXPECTED_ORIGINAL_SITE,manifestName:SOURCE_MANIFEST_NAME});
}
export async function verifyV17SourceDirectory(sourceDir){
 return verifySourceDirectory(sourceDir,{expected:EXPECTED_V17_SITE,manifestName:V17_SOURCE_MANIFEST_NAME});
}

export async function createSourceManifest(sourceDir,{expected=EXPECTED_ORIGINAL_SITE,manifestName=SOURCE_MANIFEST_NAME}={}){
 if(typeof sourceDir!=='string'||!sourceDir.trim())throw Error('SOURCE_DIR_MISSING');
 const root=resolve(sourceDir);
 if(!(await lstat(root)).isDirectory())throw Error('SOURCE_DIR_INVALID');
 const manifestPath=join(root,manifestName);
 try{await lstat(manifestPath);throw Error('SOURCE_MANIFEST_ALREADY_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
 const paths=await sourceFiles(root,manifestName);
 if(!paths.length)throw Error('SOURCE_FILES_EMPTY');
 const files=[];
 for(const path of paths){const bytes=await readFile(join(root,path));files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
 const manifest={schemaVersion:1,...expected,files,rootSha256:sourceManifestRootHash(files)};
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {projectId:manifest.projectId,versionNumber:manifest.versionNumber,sourceCommit:manifest.sourceCommit,
  fileCount:files.length,rootSha256:manifest.rootSha256};
}

export async function createOriginalSourceManifest(sourceDir){
 return createSourceManifest(sourceDir,{expected:EXPECTED_ORIGINAL_SITE,manifestName:SOURCE_MANIFEST_NAME});
}
export async function createV17SourceManifest(sourceDir){
 return createSourceManifest(sourceDir,{expected:EXPECTED_V17_SITE,manifestName:V17_SOURCE_MANIFEST_NAME});
}

export function sourceManifestRootHash(files){
 const lines=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(file=>`${file.path}\0${file.bytes}\0${file.sha256}\n`).join('');
 return hash(Buffer.from(lines,'utf8'));
}
