import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../js/learning-chat.js',import.meta.url),'utf8');
const payload=()=>({explicitQuery:' 原问题\n不截断 '.repeat(300),selectedText:'原选段',poemContext:{order:29,title:'合成文章',text:'完整上下文',synthetic:true,notStudentWork:true}});
function fixture({fail}={}){
 const records=[],events={},storage=new Map();let count=0,clock=0;
 const service={scope:'synthetic-owner-a',build:(action,content,context,options)=>({operationId:'op-'+(++count),action,content:structuredClone(content),context:structuredClone(context),occurredAt:new Date(1000*(++clock)).toISOString(),...options}),record:async op=>{if(fail)await fail(op);records.push(structuredClone(op));},retry:async()=>({ok:true})};
 const root={BdfzLearningRecords:service,addEventListener:(k,f)=>events[k]=f,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(source,{window:root,Map,JSON,Error});return{api:root.MfLearningChat,service,records,events,storage};
}
test('durable original question and request precede transport; full reply and model provenance are linked',async()=>{
 const f=fixture(),p=payload(),c=f.api.capture(p,'session');p.poemContext.title='changed after capture';const raw={reply:' 完整回答\n'.repeat(2000),model:'synthetic-fixture',modelVersion:'v1'};
 const out=await f.api.send(c,async sent=>{assert.equal(f.records.length,2);assert.equal(sent.poemContext.title,'合成文章');return raw;});
 assert(out.visible);assert.deepEqual(f.records.map(x=>x.action),['answer.submit','ai.request','assistant.reply']);assert.equal(f.records[0].content.text,p.explicitQuery);assert.equal(f.records[2].content.text,raw.reply);assert.deepEqual(f.records[2].content.response,raw);assert.equal(f.records[2].parentOperationId,f.records[1].operationId);assert.equal(f.records[1].parentOperationId,f.records[0].operationId);assert.equal(new Set(f.records.map(x=>x.occurredAt)).size,3);assert(f.records.every(x=>x.assessment.scoringEligibility==='record_only'));
});
test('storage failure before dispatch invokes no transport and exact operation survives storage retry',async()=>{
 let broken=true,calls=0;const f=fixture({fail:async()=>{if(broken)throw Error('disk');}}),c=f.api.capture(payload(),'session');await assert.rejects(f.api.send(c,async()=>{calls++;}));assert.equal(calls,0);assert.equal(f.api.pendingCount(),1);assert.throws(()=>f.api.capture(payload(),'another'));broken=false;await f.api.retryStorage();assert.equal(f.records[0].operationId,c.answer.operationId);assert.equal(f.records[0].occurredAt,c.answer.occurredAt);assert.equal(f.api.pendingCount(),0);
});
test('account change while initial storage waits prevents model dispatch',async()=>{
 let unblock;const gate=new Promise(r=>unblock=r);const f=fixture({fail:()=>gate}),c=f.api.capture(payload(),'s');let calls=0;const run=f.api.send(c,async()=>calls++);f.service.scope='synthetic-owner-b';f.events['bdfz:session-invalidated']();unblock();await assert.rejects(run);assert.equal(calls,0);assert.equal(f.records[0].context.captureScope,'synthetic-owner-a');
});
test('late response remains with original owner and is not rendered for new account',async()=>{
 const f=fixture(),c=f.api.capture(payload(),'s');const out=await f.api.send(c,async()=>{f.service.scope='synthetic-owner-b';f.events['bdfz:session-invalidated']();return{reply:'late full reply'};});assert.equal(out.visible,false);assert.equal(f.records[2].context.captureScope,'synthetic-owner-a');assert.equal(f.records[2].assessment.reportedModel,null);
});
test('transport failure is system ai.failure, never fabricated assistant feedback or score',async()=>{
 const f=fixture(),c=f.api.capture(payload(),'s');const out=await f.api.send(c,async()=>{throw Object.assign(Error('unavailable'),{status:503});});assert(out.error);assert.equal(f.records[2].action,'ai.failure');assert.equal(f.records[2].actor,'system');assert.equal(f.records[2].content.httpStatus,503);assert.equal(f.records[2].parentOperationId,f.records[1].operationId);
});
test('reply storage failure keeps full original bytes and does not repeat transport on save retry',async()=>{
 let broken=true,calls=0;const f=fixture({fail:async op=>{if(broken&&op.action==='assistant.reply')throw Error('disk');}}),c=f.api.capture(payload(),'s'),reply='保留全文'.repeat(10000);await assert.rejects(f.api.send(c,async()=>{calls++;return{reply};}));broken=false;await f.api.retryStorage();assert.equal(calls,1);assert.equal(f.records[2].content.text,reply);assert.equal(f.records[2].operationId,'op-3');
});
test('per-account per-poem parent survives next capture; another owner never inherits it',async()=>{
 const f=fixture(),a=f.api.capture(payload(),'s');await f.api.send(a,async()=>({reply:'r'}));const next=f.api.capture(payload(),'s2');assert.equal(next.answer.parentOperationId,a.answer.operationId);assert.equal(next.answer.revisesOperationId,undefined);f.service.scope='synthetic-owner-b';const other=f.api.capture(payload(),'s3');assert.equal(other.answer.parentOperationId,'');
});
