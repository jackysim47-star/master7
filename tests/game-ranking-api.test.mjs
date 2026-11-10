import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handle} from '../lib/backend.ts';

class Statement{
 constructor(sqlite,sql,args=[]){this.sqlite=sqlite;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sqlite,this.sql,args);}
 async first(){return this.sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){return {results:this.sqlite.prepare(this.sql).all(...this.args)};}
 async run(){return this.sqlite.prepare(this.sql).run(...this.args);}
}
function fixture(t){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec('PRAGMA foreign_keys=ON');
 // Ranking reads the same catalogue/readiness tables as the application.
 // Use actual migrations so new columns and visibility controls are present.
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 sqlite.exec(`
  INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES('owner','owner@example.test','owner',1,'owner-csrf',1),('staff','staff@example.test','staff',1,'staff-csrf',2);
 `);const db={prepare:sql=>new Statement(sqlite,sql),async batch(list){sqlite.exec('BEGIN');try{const results=[];for(const item of list)results.push(await item.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const staffToken='s'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_login','staff','test-salt',?,1,0)").run('a'.repeat(64));
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','staff-csrf',1,4102444800,0)").run(staffTokenHash);
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 async function call(who,path,method='GET',data){const localStaff=who==='staff',csrf=who==='owner'?'owner-csrf':who==='staff'?'staff-csrf':'',response=await handle(new Request(`https://portal.example.test${path}`,{method,headers:{'content-type':'application/json','origin':'https://portal.example.test','x-csrf-token':csrf,...(localStaff?{cookie:`__Host-master7_session=${staffToken}`}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})}),{db,identity:who&&!localStaff?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test'});return {status:response.status,data:await response.json()};}
 return {sqlite,call};
}

test('game ranking routes are owner controlled and reorder only the 38 platform cards',async t=>{
 const {sqlite,call}=fixture(t),publicDefault=await call(null,'/api/game-ranking');assert.equal(publicDefault.status,200);assert.equal(publicDefault.data.platformCount,38);assert.equal(publicDefault.data.automaticRanking,false);assert.equal(publicDefault.data.internalGamesRanked,false);assert.equal(publicDefault.data.ranking.categories.HOT[0],'megah5');assert.equal(Object.hasOwn(publicDefault.data,'updatedBy'),false);assert.equal(Object.hasOwn(publicDefault.data,'storage'),false);
 assert.equal((await call('staff','/api/admin/game-ranking')).status,403);const owner=await call('owner','/api/admin/game-ranking');assert.equal(owner.status,200);const ranking=structuredClone(owner.data.ranking);ranking.categories.HOT=[ranking.categories.HOT[1],ranking.categories.HOT[0],...ranking.categories.HOT.slice(2)];
 ranking.categories.LIVE=[...ranking.categories.LIVE].reverse();ranking.categories.SLOT=[ranking.categories.SLOT.at(-1),...ranking.categories.SLOT.slice(0,-1)];
 const duplicate=structuredClone(ranking);duplicate.categories.HOT[1]=duplicate.categories.HOT[0];assert.equal((await call('owner','/api/admin/game-ranking','POST',{ranking:duplicate})).status,400);
 const saved=await call('owner','/api/admin/game-ranking','POST',{ranking});assert.equal(saved.status,200);assert.equal(saved.data.ranking.categories.HOT[0],'jili');assert.equal(saved.data.ranking.categories.LIVE[0],'awc');assert.equal(saved.data.ranking.categories.SLOT[0],'clotplay');assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='game_provider_ranking_updated'").get().n,1);
 const publicSaved=await call(null,'/api/game-ranking');assert.equal(publicSaved.data.ranking.categories.LIVE[0],'awc');assert.equal(Object.hasOwn(publicSaved.data,'updatedBy'),false);assert.equal(Object.hasOwn(publicSaved.data,'storage'),false);
 const games=await call(null,'/api/games');assert.equal(games.status,200);assert.equal(games.data.providers.length,38);assert.equal(games.data.providers[0].id,'jili');assert.equal(games.data.providers[0].position,1);assert.equal(games.data.providers[0].rankingSource,'owner_curated');assert.equal(games.data.games.length,0);assert.equal(games.data.playable,false);assert.equal(games.data.liveReady,false);assert.equal(games.data.ranking.automaticRanking,false);
});
