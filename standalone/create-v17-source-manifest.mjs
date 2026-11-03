import {parseArgs} from 'node:util';
import {createV17SourceManifest} from './original-source-manifest.mjs';

try{
 const {values}=parseArgs({options:{'source-dir':{type:'string'}},strict:true});
 if(!values['source-dir'])throw Error('SOURCE_DIR_REQUIRED');
 const result=await createV17SourceManifest(values['source-dir']);
 console.log(JSON.stringify({created:true,...result},null,2));
}catch{
 console.error('Usage: node standalone/create-v17-source-manifest.mjs --source-dir PATH. Refuses overwrite and does not authenticate ownership.');
 process.exitCode=1;
}
