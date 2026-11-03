import {parseArgs} from 'node:util';
import {createOriginalSourceManifest} from './original-source-manifest.mjs';

try{
 const {values}=parseArgs({options:{'source-dir':{type:'string'}},strict:true});
 if(!values['source-dir'])throw Error('SOURCE_DIR_REQUIRED');
 const result=await createOriginalSourceManifest(values['source-dir']);
 console.log(JSON.stringify({created:true,...result},null,2));
}catch{
 console.error('Usage: node standalone/create-original-source-manifest.mjs --source-dir PATH. Refuses overwrite and does not authenticate ownership.');
 process.exitCode=1;
}
