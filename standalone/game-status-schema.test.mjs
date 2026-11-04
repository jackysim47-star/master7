import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

delete process.env.PORTAL_POSTGRES_URL;
delete process.env.RENDER;
process.env.NODE_ENV='test';
const postgres=process.argv.includes('--postgres');
const directory=mkdtempSync(join(tmpdir(),'master7-game-status-'));
process.env.PORTAL_DATABASE=join(directory,'portal.sqlite');
if(postgres){process.env.PORTAL_TEST_POSTGRES='1';process.env.PORTAL_TEST_POSTGRES_PATH=join(directory,'postgres');}
else{delete process.env.PORTAL_TEST_POSTGRES;delete process.env.PORTAL_TEST_POSTGRES_PATH;}
globalThis.fetch=()=>{throw Error('Unexpected network access in game status schema test');};
const {sql,withStorage}=await import('./runtime.mjs');
const table=postgres?'portal_private.portal_game_statuses':'portal_game_statuses';

await withStorage(async()=>{
 const now='2026-11-04T00:00:00.000Z';
 for(const [tenant,status] of [['main','maintenance'],['alpha','close']]){
  await sql.prepare(`INSERT INTO ${table}(tenant_id,provider,game_id,status,category_override,updated_by,updated_at) VALUES (?,?,?,?,?,?,?)`).run(tenant,'megah5','game-1',status,'fishing','owner@example.test',now);
 }
 const rows=await sql.prepare(`SELECT tenant_id,status,category_override FROM ${table} WHERE provider=? AND game_id=? ORDER BY tenant_id`).all('megah5','game-1');
 assert.deepEqual(rows.map(row=>[row.tenant_id,row.status,row.category_override]),[['alpha','close','fishing'],['main','maintenance','fishing']]);
 await assert.rejects(()=>sql.prepare(`INSERT INTO ${table}(tenant_id,provider,game_id,status,updated_by,updated_at) VALUES (?,?,?,?,?,?)`).run('main','megah5','bad','playable','owner@example.test',now));
 await assert.rejects(()=>sql.prepare(`INSERT INTO ${table}(tenant_id,provider,game_id,status,category_override,updated_by,updated_at) VALUES (?,?,?,?,?,?,?)`).run('main','megah5','bad-category','active','unknown','owner@example.test',now));
});

await sql.close();
rmSync(directory,{recursive:true,force:true});
