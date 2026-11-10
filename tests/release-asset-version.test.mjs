import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('release, browser assets and service-worker cache share one version',()=>{
 const backend=read('lib/backend.ts'),portal=read('app/portal.html'),worker=read('public/service-worker.js'),release=backend.match(/export const RELEASE = '([^']+)'/)?.[1];assert.ok(release);
 const assets=[...portal.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="(\/assets\/[^"?]+)\?v=([^"]+)"/g)];assert.ok(assets.length>=20);for(const [,path,version] of assets){assert.match(path,/^\/assets\//);assert.equal(version,release,path);}
 assert.ok(assets.some(([,path])=>path==='/assets/app.js'));assert.equal(worker.match(/const CACHE='master7-shell-([^']+)'/)?.[1],release);
});
