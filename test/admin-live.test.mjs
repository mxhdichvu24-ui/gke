import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveSync} from '../src/admin-live.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('live updates fetch only on revision changes, retry failures, and pause while hidden',async()=>{
 let next=0,reads=0,updates=0,visible=true,callback,delay,fail=false,status;
 const sync=createLiveSync({readVersion:async()=>{reads++;if(fail)throw Error();return String(next);},onChange:async()=>{updates++;},onStatus:s=>status=s,isVisible:()=>visible,setTimer:(fn,ms)=>{callback=fn;delay=ms;return 1;},clearTimer:()=>{}});
 sync.start();await flush();assert.equal(updates,1);assert.equal(status,'live');assert.equal(delay,2000);
 await callback();assert.equal(reads,2);assert.equal(updates,1);
 next++;await callback();assert.equal(updates,2);
 visible=false;await callback();assert.equal(reads,3);
 visible=true;fail=true;await callback();assert.equal(status,'reconnecting');assert.equal(delay,4000);
 fail=false;next++;sync.wake();await flush();assert.equal(updates,3);assert.equal(delay,2000);
 sync.stop();const before=reads;await callback();assert.equal(reads,before);
});
test('simultaneous wake events do not overlap reads, and stopping suppresses late rendering',async()=>{
 let complete,reads=0,updates=0;
 const sync=createLiveSync({readVersion:()=>{reads++;return new Promise(resolve=>complete=resolve);},onChange:async()=>{updates++;},onStatus:()=>{},isVisible:()=>true,setTimer:()=>1,clearTimer:()=>{}});
 sync.start();sync.wake();sync.wake();assert.equal(reads,1);sync.stop();complete('1');await flush();assert.equal(updates,0);
});
