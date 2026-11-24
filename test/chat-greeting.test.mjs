import test from 'node:test';
import assert from 'node:assert/strict';
import {createGreetingSchedule,greetingMessage} from '../public/chat-greeting.mjs';
function fixture(){
 let now=100000,sequence=0,shown=0,hidden=0,allowed=true,engaged=false;const timers=new Map(),saved=new Map();
 const clock={now:()=>now,setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,at:now+delay});return id},clearTimeout(id){timers.delete(id)}};
 const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
 const options={clock,storage,show:()=>shown++,hide:()=>hidden++,canShow:()=>allowed,isEngaged:()=>engaged};
 const advance=ms=>{const end=now+ms;for(;;){const first=[...timers.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!first)break;now=first[1].at;timers.delete(first[0]);first[1].fn()}now=end};
 return{options,advance,counts:()=>({shown,hidden}),allow:value=>{allowed=value},engage:value=>{engaged=value}};
}
test('greeting appears after five seconds, stays briefly and repeats after ninety seconds',()=>{
 const f=fixture(),schedule=createGreetingSchedule(f.options);schedule.start();schedule.start();
 f.advance(4999);assert.equal(f.counts().shown,0);f.advance(1);assert.deepEqual(f.counts(),{shown:1,hidden:0});
 f.advance(14000);assert.deepEqual(f.counts(),{shown:1,hidden:1});f.advance(75999);assert.equal(f.counts().shown,1);f.advance(1);assert.equal(f.counts().shown,2);schedule.stop();
});
test('closing or opening chat snoozes invitations for ten minutes, including after navigation',()=>{
 const f=fixture(),schedule=createGreetingSchedule(f.options);schedule.start();f.advance(5000);schedule.snooze();schedule.stop();
 const nextPage=createGreetingSchedule(f.options);nextPage.start();f.advance(599999);assert.equal(f.counts().shown,1);f.advance(1);assert.equal(f.counts().shown,2);nextPage.stop();
});
test('no invitation while typing, hidden or chatting; focused invitation is not removed on a timer',()=>{
 const f=fixture(),schedule=createGreetingSchedule(f.options);f.allow(false);schedule.start();f.advance(95000);assert.equal(f.counts().shown,0);
 f.allow(true);schedule.wake();assert.equal(f.counts().shown,1);f.engage(true);f.advance(20000);assert.equal(f.counts().hidden,0);
 f.engage(false);schedule.wake();assert.equal(f.counts().hidden,1);f.advance(70000);assert.equal(f.counts().shown,2);
 f.allow(false);schedule.wake();assert.equal(f.counts().hidden,2);schedule.stop();f.allow(true);f.advance(200000);assert.equal(f.counts().shown,2);
});
test('blocked browser storage does not disable greetings; contextual text has no artificial delivery promise',()=>{
 const f=fixture(),schedule=createGreetingSchedule({...f.options,storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});schedule.start();f.advance(5000);assert.equal(f.counts().shown,1);schedule.stop();
 assert.match(greetingMessage('/vi/kien-thuc/my-article','vi'),/tìm hiểu/);assert.match(greetingMessage('/vi/tinh-cuoc','vi'),/kích thước/);assert.match(greetingMessage('/vi/tra-cuu','vi'),/vận đơn/);assert.match(greetingMessage('/resources','en'),/shipping/);
});
