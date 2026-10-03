import {SOURCES,TARGET,VERSION,MAX_BYTES,MAX_ROWS,allowedStorageKey,validateRow,hashText,trustedEvent,partition} from './legacy-transfer-core.1c254c8037cd.js';
const site=Object.keys(SOURCES).find(k=>SOURCES[k]===location.origin),nonce=location.hash.slice(1),started=Date.now();
const status=document.getElementById('transfer-status'),button=document.getElementById('transfer-copy');
const peer={origin:TARGET,source:window.opener,nonce};
let ready=false,busy=false,waiter=null;
function post(message){peer.source.postMessage({...message,version:VERSION,nonce},TARGET);}
function fail(message){status.textContent=message;button.disabled=true;ready=false;}
async function readStore(database,store){
 if(indexedDB.databases){const names=await indexedDB.databases();if(!names.some(d=>d.name===database))return [];}
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(database);let absent=false;
  request.onupgradeneeded=()=>{absent=true;request.transaction.abort();};
  request.onerror=()=>absent?resolve([]):reject(Error('LEGACY_DATABASE_READ_FAILED'));
  request.onblocked=()=>reject(Error('LEGACY_DATABASE_BLOCKED'));
  request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(store)){db.close();reject(Error('LEGACY_DATABASE_SCHEMA_UNKNOWN'));return;}
   const tx=db.transaction(store,'readonly'),rows=[];const q=tx.objectStore(store).openCursor();
   q.onsuccess=()=>{const c=q.result;if(!c)return;if(database!=='bdfz-learning-operations-v1'||c.value.siteKey===site)rows.push({kind:'indexedDB',database,store,key:String(c.key),value:c.value});if(rows.length>MAX_ROWS){tx.abort();return;}c.continue();};
   tx.oncomplete=()=>{db.close();resolve(rows);};tx.onabort=()=>{db.close();reject(Error('LEGACY_DATABASE_READ_FAILED'));};
  };
 });
}
function acknowledgement(index,digest){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiter=null;reject(Error('LEGACY_ACK_TIMEOUT'));},30000);waiter={index,digest,resolve:()=>{clearTimeout(timer);waiter=null;resolve();}};});}
window.addEventListener('message',event=>{
 if(Date.now()-started>10*60*1000)return;
 if(trustedEvent(event,peer,'hello')){ready=true;button.disabled=false;status.textContent='接收方已確認為琅琅。原站資料會完整保留，複製不會重新評分。';}
 if(trustedEvent(event,peer,'ack')&&waiter&&event.data.index===waiter.index&&event.data.digest===waiter.digest)waiter.resolve();
});
button.addEventListener('click',async()=>{
 if(!ready||busy)return;busy=true;button.disabled=true;
 try{
  const rows=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(allowedStorageKey(site,key))rows.push({kind:'localStorage',key,value:localStorage.getItem(key)});}
  rows.push(...await readStore('bdfz-learning-capture-v1','captures'),...await readStore('bdfz-learning-operations-v1','operations'));
  if(rows.length>MAX_ROWS)throw Error('LEGACY_DATA_TOO_LARGE');for(const row of rows)validateRow(site,row);
  const bytes=new TextEncoder().encode(JSON.stringify(rows)).length;if(bytes>MAX_BYTES)throw Error('LEGACY_DATA_TOO_LARGE');
  const chunks=partition(rows),digests=[];
  for(let index=0;index<chunks.length;index++){const text=JSON.stringify(chunks[index]),digest=await hashText(text);digests.push(digest);const ack=acknowledgement(index,digest);post({kind:'chunk',index,text,digest,site});await ack;status.textContent=`已校驗 ${index+1} / ${chunks.length} 批，原資料仍保留。`;}
  const digest=await hashText(digests.join('\n')),ack=acknowledgement(chunks.length,digest);post({kind:'complete',index:chunks.length,rows:rows.length,bytes,digest,site});await ack;
  status.textContent=`已複製並逐批回讀 ${rows.length} 筆本機記錄。原站資料未刪除；可以返回琅琅查看。`;
 }catch{status.textContent='複製尚未完成，原站資料沒有改動。請保留本頁，返回琅琅查看已接收批次後再試。';}
});
if(!site||!peer.source||!/^[a-f0-9-]{32,64}$/i.test(nonce))fail('請從琅琅「我的／舊站本機記錄」開啟此頁。');else post({kind:'ready',site});
