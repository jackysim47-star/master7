import {randomUUID} from 'node:crypto';

export const PRODUCTION_ACCEPTANCE_CATEGORIES=Object.freeze(['domain','credential','payment','signoff'] as const);
export type ProductionAcceptanceCategory=typeof PRODUCTION_ACCEPTANCE_CATEGORIES[number];
export type ProductionAcceptanceEnvironment='uat'|'production';
export type ProductionAcceptanceResult='passed'|'failed'|'revoked';
export type ProductionAcceptanceActor={id:string;role:string};

export const PAYMENT_ACCEPTANCE_CAPABILITIES=Object.freeze([
 'order','payment','callback','query_recovery','wallet_credit','merchant_settlement',
] as const);

export const PRODUCTION_ACCEPTANCE_ROLLBACK_SUBJECT='rollback_rehearsal_17.0.0-selfbuilt.172-privileged-role-boundary' as const;

export const PRODUCTION_ACCEPTANCE_REQUIREMENTS=Object.freeze([
 {category:'domain',subjectId:'www.master7.best',capabilities:['dns_tls_routing']},
 {category:'domain',subjectId:'www.master7.site',capabilities:['dns_tls_routing']},
 {category:'credential',subjectId:'vpay',capabilities:['rotated']},
 {category:'credential',subjectId:'gspay_myr',capabilities:['rotated']},
 {category:'credential',subjectId:'gspay_usdt',capabilities:['rotated']},
 {category:'credential',subjectId:'1mpay',capabilities:['rotated']},
 {category:'credential',subjectId:'game_providers',capabilities:['rotated']},
 {category:'payment',subjectId:'vpay_myr',capabilities:[...PAYMENT_ACCEPTANCE_CAPABILITIES]},
 {category:'payment',subjectId:'gspay_myr',capabilities:[...PAYMENT_ACCEPTANCE_CAPABILITIES]},
 {category:'payment',subjectId:'gspay_usdt',capabilities:[...PAYMENT_ACCEPTANCE_CAPABILITIES]},
 {category:'payment',subjectId:'onempay_myr',capabilities:[...PAYMENT_ACCEPTANCE_CAPABILITIES]},
 {category:'signoff',subjectId:'monitoring',capabilities:['approved']},
 {category:'signoff',subjectId:PRODUCTION_ACCEPTANCE_ROLLBACK_SUBJECT,capabilities:['approved']},
 {category:'signoff',subjectId:'owner',capabilities:['approved']},
 {category:'signoff',subjectId:'operations',capabilities:['approved']},
] as const);

type CurrentRow={
 category:ProductionAcceptanceCategory;subject_id:string;capability:string;environment:ProductionAcceptanceEnvironment;
 event_id:string;current_event_id:string|null;projection_integrity:number;revision:number;result:ProductionAcceptanceResult;evidence_sha256:string;evidence_reference:string;
 verified_by:string;observed_at:number;recorded_at:number;
};

type LatestRow={latest_event_id:string|null;latest_revision:number|null;current_event_id:string|null;history_min_revision:number|null;history_count:number|string};

export class ProductionAcceptanceError extends Error{
 status:number;code:string;
 constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}
}

const fail=(status:number,code:string,message:string):never=>{throw new ProductionAcceptanceError(status,code,message);};
const actorId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=256&&!/[\u0000-\u001f\u007f]/u.test(value);
const category=(value:unknown):value is ProductionAcceptanceCategory=>PRODUCTION_ACCEPTANCE_CATEGORIES.includes(value as ProductionAcceptanceCategory);
const environment=(value:unknown):value is ProductionAcceptanceEnvironment=>value==='uat'||value==='production';
const result=(value:unknown):value is ProductionAcceptanceResult=>value==='passed'||value==='failed'||value==='revoked';
const subject=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,127}$/.test(value);
const capability=(value:unknown):value is string=>typeof value==='string'&&/^[a-z][a-z0-9_]{1,63}$/.test(value);
const reference=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,199}$/.test(value);

function readAccess(actor:ProductionAcceptanceActor){
 if(!actorId(actor?.id))fail(401,'SIGN_IN_REQUIRED','Sign in required');
 if(actor.role!=='owner'&&actor.role!=='staff')fail(403,'ACCESS_DENIED','Owner or staff access required');
}
function ownerAccess(actor:ProductionAcceptanceActor){
 if(!actorId(actor?.id))fail(401,'SIGN_IN_REQUIRED','Sign in required');
 if(actor.role!=='owner')fail(403,'OWNER_REQUIRED','Owner access required');
}

function validCombination(kind:ProductionAcceptanceCategory,subjectId:string,capabilityId:string){
 if(kind==='domain')return capabilityId==='dns_tls_routing'&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(subjectId);
 if(kind==='credential')return capabilityId==='rotated';
 if(kind==='payment')return PAYMENT_ACCEPTANCE_CAPABILITIES.includes(capabilityId as typeof PAYMENT_ACCEPTANCE_CAPABILITIES[number]);
 return kind==='signoff'&&capabilityId==='approved';
}

async function currentRows(db:D1Database,selectedEnvironment?:ProductionAcceptanceEnvironment){
 const where=selectedEnvironment?'AND e.environment=?':'',statement=db.prepare(`SELECT e.category,e.subject_id,e.capability,e.environment,e.id AS event_id,
  c.event_id AS current_event_id,CASE WHEN c.event_id=e.id
   AND (SELECT MIN(history.revision) FROM production_acceptance_events history WHERE history.category=e.category AND history.subject_id=e.subject_id AND history.capability=e.capability AND history.environment=e.environment)=1
   AND (SELECT COUNT(*) FROM production_acceptance_events history WHERE history.category=e.category AND history.subject_id=e.subject_id AND history.capability=e.capability AND history.environment=e.environment)=e.revision
   THEN 1 ELSE 0 END AS projection_integrity,
  e.revision,e.result,e.evidence_sha256,e.evidence_reference,e.verified_by,e.observed_at,e.recorded_at
  FROM production_acceptance_events e LEFT JOIN production_acceptance_current c
   ON c.category=e.category AND c.subject_id=e.subject_id AND c.capability=e.capability AND c.environment=e.environment
  WHERE NOT EXISTS(SELECT 1 FROM production_acceptance_events newer
   WHERE newer.category=e.category AND newer.subject_id=e.subject_id AND newer.capability=e.capability
    AND newer.environment=e.environment AND newer.revision>e.revision)
  ${where} ORDER BY e.category,e.subject_id,e.capability`);
 const rows=selectedEnvironment?await statement.bind(selectedEnvironment).all<CurrentRow>():await statement.all<CurrentRow>();
 return (rows.results??[]) as CurrentRow[];
}

function requirementState(rows:CurrentRow[],selectedEnvironment:ProductionAcceptanceEnvironment){
 const map=new Map(rows.filter(row=>row.environment===selectedEnvironment).map(row=>[`${row.category}:${row.subject_id}:${row.capability}`,row]));
 return PRODUCTION_ACCEPTANCE_REQUIREMENTS.map(requirement=>({
  category:requirement.category,subjectId:requirement.subjectId,
  capabilities:Object.fromEntries(requirement.capabilities.map(capabilityId=>{
   const row=map.get(`${requirement.category}:${requirement.subjectId}:${capabilityId}`);
   return [capabilityId,row?{passed:row.result==='passed'&&Number(row.projection_integrity)===1,integrityValid:Number(row.projection_integrity)===1,
    result:row.result,eventId:row.event_id,currentEventId:row.current_event_id,revision:Number(row.revision),
    evidenceSha256:row.evidence_sha256,evidenceReference:row.evidence_reference,verifiedBy:row.verified_by,
    observedAt:Number(row.observed_at),recordedAt:Number(row.recorded_at)}:
    {passed:false,integrityValid:true,result:'not_recorded',eventId:null,currentEventId:null,revision:0,evidenceSha256:null,evidenceReference:null,verifiedBy:null,observedAt:null,recordedAt:null}];
  })),
 }));
}

export async function getProductionAcceptanceReadiness(db:D1Database){
 const rows=await currentRows(db,'production'),requirements=requirementState(rows,'production');
 const ready=(categoryId:ProductionAcceptanceCategory)=>requirements.filter(item=>item.category===categoryId).every(item=>Object.values(item.capabilities).every((state:any)=>state.passed===true));
 const paymentProfiles=Object.fromEntries(requirements.filter(item=>item.category==='payment').map(item=>[item.subjectId,Object.values(item.capabilities).every((state:any)=>state.passed===true)]));
 const integrityBlockers=rows.filter(row=>Number(row.projection_integrity)!==1).map(row=>`${row.category}:${row.subject_id}:${row.capability}`),integrityReady=integrityBlockers.length===0;
 const domainReady=ready('domain'),credentialRotationReady=ready('credential'),paymentReady=ready('payment'),signoffReady=ready('signoff');
 return {domainReady,credentialRotationReady,paymentReady,signoffReady,integrityReady,externalAcceptanceReady:integrityReady&&domainReady&&credentialRotationReady&&paymentReady&&signoffReady,paymentProfiles,requirements,
  integrityBlockers,
  blockers:requirements.flatMap(item=>Object.entries(item.capabilities).filter(([,state]:any)=>state.passed!==true).map(([capabilityId])=>`${item.category}:${item.subjectId}:${capabilityId}`))};
}

export async function getProductionAcceptance(db:D1Database,actor:ProductionAcceptanceActor,input:{environment?:unknown;eventLimit?:unknown}={}){
 readAccess(actor);const requestedEnvironment=input.environment??'production';
 if(!environment(requestedEnvironment))fail(400,'INVALID_ENVIRONMENT','Environment must be uat or production');
 const selected=requestedEnvironment as ProductionAcceptanceEnvironment;
 const eventLimit=input.eventLimit===undefined?200:Number(input.eventLimit);
 if(!Number.isSafeInteger(eventLimit)||eventLimit<0||eventLimit>500)fail(400,'INVALID_LIMIT','Event limit must be between 0 and 500');
 const rows=await currentRows(db,selected),requirements=requirementState(rows,selected);let events:unknown[]=[];
 if(eventLimit>0){const result=await db.prepare(`SELECT id,category,subject_id,capability,environment,revision,result,evidence_sha256,evidence_reference,verified_by,observed_at,recorded_at
   FROM production_acceptance_events WHERE environment=? ORDER BY recorded_at DESC,id DESC LIMIT ?`).bind(selected,eventLimit).all();events=result.results??[];}
 const integrityBlockers=rows.filter(row=>Number(row.projection_integrity)!==1).map(row=>`${row.category}:${row.subject_id}:${row.capability}`);
 return {environment:selected,categories:[...PRODUCTION_ACCEPTANCE_CATEGORIES],paymentCapabilities:[...PAYMENT_ACCEPTANCE_CAPABILITIES],integrityReady:integrityBlockers.length===0,integrityBlockers,requirements,events};
}

export async function recordProductionAcceptance(db:D1Database,actor:ProductionAcceptanceActor,input:Record<string,unknown>,at=Math.floor(Date.now()/1000)){
 ownerAccess(actor);
 if(Object.keys(input).some(key=>!['category','subjectId','capability','environment','result','evidenceSha256','evidenceReference','observedAt','expectedEventId'].includes(key)))fail(400,'INVALID_FIELDS','Only production acceptance evidence fields are accepted');
 const requestedCategory=input.category,requestedSubjectId=input.subjectId,requestedCapability=input.capability,requestedEnvironment=input.environment,selectedResult=input.result,
  evidenceSha256=input.evidenceSha256,evidenceReference=input.evidenceReference,observedAt=Number(input.observedAt),expectedEventId=input.expectedEventId;
 if(!category(requestedCategory))fail(400,'INVALID_CATEGORY','Invalid acceptance category');
 if(!subject(requestedSubjectId))fail(400,'INVALID_SUBJECT','Invalid acceptance subject');
 if(!capability(requestedCapability))fail(400,'INVALID_CAPABILITY','Invalid capability for acceptance category');
 if(!environment(requestedEnvironment))fail(400,'INVALID_ENVIRONMENT','Environment must be uat or production');
 const kind=requestedCategory as ProductionAcceptanceCategory,subjectId=requestedSubjectId as string,
  capabilityId=requestedCapability as string,selectedEnvironment=requestedEnvironment as ProductionAcceptanceEnvironment;
 if(!validCombination(kind,subjectId,capabilityId))fail(400,'INVALID_CAPABILITY','Invalid capability for acceptance category');
 if(!result(selectedResult))fail(400,'INVALID_RESULT','Result must be passed, failed or revoked');
 if(typeof evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(evidenceSha256))fail(400,'INVALID_EVIDENCE_DIGEST','Evidence SHA-256 must be lowercase hexadecimal');
 if(!reference(evidenceReference))fail(400,'INVALID_EVIDENCE_REFERENCE','Evidence reference must be a non-secret identifier');
 if(!Number.isSafeInteger(observedAt)||observedAt<0||observedAt>at+300)fail(400,'INVALID_OBSERVED_AT','Observed time is invalid');
 if(!Object.hasOwn(input,'expectedEventId')||expectedEventId!==null&&(typeof expectedEventId!=='string'||!/^[a-f0-9-]{36}$/.test(expectedEventId)))fail(400,'INVALID_EXPECTED_EVENT','Current event id or null is required');
 const latest=await db.prepare(`SELECT
  (SELECT id FROM production_acceptance_events WHERE category=? AND subject_id=? AND capability=? AND environment=? ORDER BY revision DESC LIMIT 1) AS latest_event_id,
  (SELECT revision FROM production_acceptance_events WHERE category=? AND subject_id=? AND capability=? AND environment=? ORDER BY revision DESC LIMIT 1) AS latest_revision,
  (SELECT event_id FROM production_acceptance_current WHERE category=? AND subject_id=? AND capability=? AND environment=?) AS current_event_id,
  (SELECT MIN(revision) FROM production_acceptance_events WHERE category=? AND subject_id=? AND capability=? AND environment=?) AS history_min_revision,
  (SELECT COUNT(*) FROM production_acceptance_events WHERE category=? AND subject_id=? AND capability=? AND environment=?) AS history_count`)
  .bind(kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment).first<LatestRow>();
 const latestEventId=latest?.latest_event_id??null,currentEventId=latest?.current_event_id??null;
 const latestRevision=latest?.latest_revision===null||latest?.latest_revision===undefined?null:Number(latest.latest_revision),historyCount=Number(latest?.history_count??0),historyMin=latest?.history_min_revision===null||latest?.history_min_revision===undefined?null:Number(latest.history_min_revision);
 if(latestEventId!==currentEventId||(latestEventId!==null&&(historyMin!==1||historyCount!==latestRevision)))fail(409,'ACCEPTANCE_INTEGRITY_ERROR','Acceptance projection does not match immutable history');
 if(expectedEventId!==latestEventId)fail(409,'STALE_ACCEPTANCE','Acceptance changed; refresh and try again');
 const id=randomUUID(),target=`${kind}:${subjectId}:${capabilityId}:${selectedEnvironment}:${selectedResult}:${id}`;
 try{await db.batch([
  db.prepare(`INSERT INTO production_acceptance_events
   (id,category,subject_id,capability,environment,revision,result,evidence_sha256,evidence_reference,verified_by,observed_at,recorded_at)
   SELECT ?,?,?,?, ?,COALESCE((SELECT MAX(e.revision) FROM production_acceptance_events e
    WHERE e.category=? AND e.subject_id=? AND e.capability=? AND e.environment=?),0)+1, ?,?,?,?,?,? WHERE
    (CAST(? AS TEXT) IS NULL AND NOT EXISTS(SELECT 1 FROM production_acceptance_current WHERE category=? AND subject_id=? AND capability=? AND environment=?)) OR
    (CAST(? AS TEXT) IS NOT NULL AND EXISTS(SELECT 1 FROM production_acceptance_current WHERE category=? AND subject_id=? AND capability=? AND environment=? AND event_id=?))`)
   .bind(id,kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment,selectedResult,evidenceSha256,evidenceReference,actor.id,observedAt,at,
    expectedEventId,kind,subjectId,capabilityId,selectedEnvironment,expectedEventId,kind,subjectId,capabilityId,selectedEnvironment,expectedEventId),
  db.prepare(`INSERT INTO production_acceptance_current(category,subject_id,capability,environment,event_id)
   SELECT ?,?,?,?,id FROM production_acceptance_events WHERE id=?
   ON CONFLICT(category,subject_id,capability,environment) DO UPDATE SET event_id=excluded.event_id
   WHERE CAST(? AS TEXT) IS NOT NULL AND production_acceptance_current.event_id=?`).bind(kind,subjectId,capabilityId,selectedEnvironment,id,expectedEventId,expectedEventId),
  db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,'production_acceptance_recorded',?,? FROM production_acceptance_events WHERE id=?").bind(randomUUID(),actor.id,target,at,id),
 ]);}catch(error){
  const detail=String(error instanceof Error?error.message:error),sqlState=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  if(/acceptance (?:projection|history)/i.test(detail))fail(409,'ACCEPTANCE_INTEGRITY_ERROR','Acceptance projection does not match immutable history');
  const conflict=sqlState==='23505'||/(?:unique|duplicate key)/i.test(detail)&&/production_acceptance_events/i.test(detail);
  if(conflict){const state=await db.prepare(`SELECT
   (SELECT id FROM production_acceptance_events WHERE category=? AND subject_id=? AND capability=? AND environment=? ORDER BY revision DESC LIMIT 1) AS latest_event_id,
   (SELECT event_id FROM production_acceptance_current WHERE category=? AND subject_id=? AND capability=? AND environment=?) AS current_event_id`)
   .bind(kind,subjectId,capabilityId,selectedEnvironment,kind,subjectId,capabilityId,selectedEnvironment).first<{latest_event_id:string|null;current_event_id:string|null}>();if((state?.latest_event_id??null)!==(state?.current_event_id??null))fail(409,'ACCEPTANCE_INTEGRITY_ERROR','Acceptance projection does not match immutable history');fail(409,'STALE_ACCEPTANCE','Acceptance changed; refresh and try again');}
  throw error;
 }
 const recorded=await db.prepare(`SELECT e.id,c.event_id AS current_event_id FROM production_acceptance_events e
  LEFT JOIN production_acceptance_current c ON c.category=e.category AND c.subject_id=e.subject_id AND c.capability=e.capability AND c.environment=e.environment
  WHERE e.id=?`).bind(id).first<{id:string;current_event_id:string|null}>();
 if(!recorded)fail(409,'STALE_ACCEPTANCE','Acceptance changed; refresh and try again');
 if(recorded!.current_event_id!==id)fail(409,'ACCEPTANCE_INTEGRITY_ERROR','Acceptance projection does not match immutable history');
 return {status:'recorded',id,category:kind,subjectId,capability:capabilityId,environment:selectedEnvironment,result:selectedResult,accepted:selectedResult==='passed'};
}
