import {test}from'node:test';import assert from'node:assert/strict';
import{calculateWeights,normalizeParcel}from'../server/weights.mjs';
const p={weight:'2',length:'40',width:'30',height:'20'};
const rules={divisor:5000,incrementG:500,minimumG:0,dimensionIncrementCentiCm:0,aggregation:'per_package'};
test('approved synthetic dimensional and actual weight examples',()=>{
 assert.equal(calculateWeights([p],rules).billableKg,5);
 assert.equal(calculateWeights([p],{...rules,divisor:6000}).billableKg,4);
 assert.equal(calculateWeights([{...p,weight:'6.2'}],rules).billableKg,6.5);
});
test('per parcel and aggregate rounding give intentionally different results',()=>{
 const items=[p,{...p,weight:'6.2'}];
 assert.equal(calculateWeights(items,rules).billableKg,11.5);
 assert.equal(calculateWeights(items,{...rules,aggregation:'aggregate'}).billableKg,11);
});
test('exact gram boundaries and dimension rounding',()=>{
 assert.equal(calculateWeights([{...p,weight:'5.000'}],rules).billableKg,5);
 assert.equal(calculateWeights([{...p,weight:'5.001'}],rules).billableKg,5.5);
 assert.equal(calculateWeights([{...p,length:'40.01'}],rules).billableKg,5);
 assert.equal(calculateWeights([{...p,length:'40.01'}],{...rules,dimensionIncrementCentiCm:100}).breakdown[0].dimensionsCm[0],41);
 assert.equal(calculateWeights([{...p,count:3}],rules).billableKg,15);
 assert.equal(normalizeParcel({...p,weight:'2.0001'}),null);
 assert.equal(normalizeParcel({...p,count:1.1}),null);
});
