import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone} from '../src/contact-validation.mjs';
test('phone accepts arbitrary digits up to 13 and preserves leading zeroes without country conversion',()=>{
 for(const value of ['0','1','12345','0879089789','0012025550123','8498765432101'])assert.equal(normalizePhone(value),value);
 assert.equal(normalizePhone(' 00123456789 '),'00123456789');
 for(const value of ['12345678901234','+84','123-456','abc','1e8','',null,123456])assert.equal(normalizePhone(value),null);
});
