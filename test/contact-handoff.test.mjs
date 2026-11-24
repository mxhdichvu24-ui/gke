import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationUrl,prepareHandoff} from '../public/contact-handoff.mjs';

test('existing Facebook and Instagram profiles become direct conversation links',()=>{
 assert.equal(conversationUrl({kind:'facebook',url:'https://www.facebook.com/gkelogistics.62?ref=website'}),'https://m.me/gkelogistics.62');
 assert.equal(conversationUrl({kind:'messenger',url:'https://m.me/gkelogistics.62'}),'https://m.me/gkelogistics.62');
 assert.equal(conversationUrl({kind:'instagram',url:'https://www.instagram.com/gkelogistics/'}),'https://ig.me/m/gkelogistics');
 assert.equal(conversationUrl({kind:'messenger',url:'https://facebook.com/profile.php?id=123456789'}),'https://m.me/123456789');
});
test('personal message stays out of unsupported provider URLs',()=>{
 const msg='Tư vấn giúp: người nhận A, +84912345678';
 for(const channel of [{kind:'messenger',url:'https://m.me/gkelogistics.62'},{kind:'instagram',url:'https://ig.me/m/gkelogistics'},{kind:'zalo',url:'https://zalo.me/123456789'}]){
  const handoff=prepareHandoff(channel,msg);assert.ok(handoff.copyRequired);assert.equal(handoff.prefilled,false);assert.equal(new URL(handoff.url).search,'');
 }
});
test('prefill is encoded only for channels with documented support',()=>{
 const text='Gửi hàng & tư vấn?\n20 kg';
 for(const c of [{kind:'whatsapp',url:'https://wa.me/84912345678'},{kind:'email',url:'mailto:help@example.com'}]){const h=prepareHandoff(c,text);assert.equal(new URL(h.url).searchParams.get(c.kind==='email'?'body':'text'),text);assert.equal(h.prefilled,true);assert.equal(h.copyRequired,false)}
});
test('do not advertise profiles or unverified TikTok URLs as message links',()=>{
 for(const c of [{kind:'messenger',url:'javascript:alert(1)'},{kind:'messenger',url:'https://m.me.evil.example/gke'},{kind:'facebook',url:'https://facebook.com/groups/a'},{kind:'instagram',url:'https://instagram.com/p/some-post'},{kind:'tiktok',url:'https://tiktok.com/@gke.global'},{kind:'zalo',url:'https://zalo.me.evil.example/1'},{kind:'messenger',url:'https://user:pass@m.me/gke'}])assert.equal(conversationUrl(c),null);
});
test('empty draft opens a chat without a false sent state',()=>{
 assert.deepEqual(prepareHandoff({kind:'messenger',url:'https://m.me/gkelogistics.62'},''),{url:'https://m.me/gkelogistics.62',copyRequired:false,prefilled:false});
});
