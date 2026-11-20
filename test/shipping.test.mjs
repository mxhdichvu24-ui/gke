import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, shipment } from '../server/shipping.mjs';

const demo = {GKE_DEMO_RATES:'1', VERCEL_ENV:'preview'};
const parcel = {route:'US', service:'economy', weight:'2', length:'40', width:'30', height:'20'};

test('reference fixture uses exact volume and upward billing increments', () => {
  const {http, body} = estimate(parcel,demo);
  assert.equal(http,200);
  assert.equal(body.volumeKg,4.8);
  assert.equal(body.billableKg,5);
  assert.equal(body.services[0].total,520_000);
  assert.equal(body.demo,true);
});

test('matches an exact half-kilogram boundary from localized input', () => {
  assert.equal(estimate({...parcel,weight:'6,5'},demo).body.billableKg,6.5);
  assert.equal(estimate({...parcel,weight:'6.501'},demo).body.billableKg,7);
});

test('rejects incomplete dimensions, signs, and mismatched services', () => {
  assert.equal(shipment({...parcel,height:''}),null);
  assert.equal(shipment({...parcel,weight:-1}),null);
  assert.equal(shipment({...parcel,route:'UK'}),null);
});

test('production and disabled fixture both require quote', () => {
  assert.equal(estimate(parcel,{...demo,VERCEL_ENV:'production'}).body.status,'request_required');
  assert.equal(estimate(parcel,{}).body.status,'request_required');
});

test('manual service and all eligible services use different outcomes', () => {
  assert.equal(estimate({...parcel,service:'b2b'},demo).body.reason,'manual_service');
  const {body} = estimate({...parcel,route:'UK',service:''},demo);
  assert.deepEqual(body.services.map(row => row.id), ['seller-uk','tiktok-uk']);
});
