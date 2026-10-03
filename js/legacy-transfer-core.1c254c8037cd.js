export const SOURCES=Object.freeze({mf:'https://mf.bdfz.net',mx:'https://mx.bdfz.net'});
export const TARGET='https://recite.bdfz.net';
export const VERSION='langlang-legacy-copy-v1';
export const MAX_BYTES=50*1024*1024,MAX_ROWS=20000,MAX_CHUNK_BYTES=2*1024*1024;
export function allowedStorageKey(site,key){
 if(!Object.hasOwn(SOURCES,site)||typeof key!=='string')return false;
 if(key===`bdfz-progress-queue:${site}`||key===`bdfz-record-queue:${site}`)return true;
 return site==='mf'&&(['mf-achievements-v2','mf-reading-mode-v1','theme'].includes(key)||key.startsWith('mf-learning-parent-v1:'));
}
export function plainJson(value){
 if(value===null||['string','number','boolean'].includes(typeof value))return true;
 if(Array.isArray(value))return value.every(plainJson);
 return typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype&&Object.values(value).every(plainJson);
}
export function validateRow(site,row){
 if(!Object.hasOwn(SOURCES,site)||!row||!plainJson(row)||typeof row.key!=='string'||row.key.length>2048)throw Error('LEGACY_ROW_INVALID');
 if(row.kind==='localStorage'){
  if(!allowedStorageKey(site,row.key)||typeof row.value!=='string')throw Error('LEGACY_STORAGE_NOT_ALLOWED');
 }else if(row.kind==='indexedDB'){
  const expected={'bdfz-learning-capture-v1':'captures','bdfz-learning-operations-v1':'operations'};
  if(expected[row.database]!==row.store||!row.value||typeof row.value!=='object')throw Error('LEGACY_DATABASE_NOT_ALLOWED');
  if(row.database==='bdfz-learning-operations-v1'&&row.value.siteKey!==site)throw Error('LEGACY_SOURCE_MISMATCH');
 }else throw Error('LEGACY_STORAGE_NOT_ALLOWED');
 return row;
}
export async function hashText(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function trustedEvent(event,{origin,source,nonce},kind){return event.origin===origin&&event.source===source&&event.data?.version===VERSION&&event.data.nonce===nonce&&event.data.kind===kind;}
export function partition(rows){
 const result=[];let current=[],bytes=2;
 for(const row of rows){const size=new TextEncoder().encode(JSON.stringify(row)).length+1;if(size+2>MAX_CHUNK_BYTES)throw Error('LEGACY_RECORD_TOO_LARGE');if(current.length&&(current.length>=32||bytes+size>MAX_CHUNK_BYTES)){result.push(current);current=[];bytes=2;}current.push(row);bytes+=size;}
 if(current.length)result.push(current);return result;
}
