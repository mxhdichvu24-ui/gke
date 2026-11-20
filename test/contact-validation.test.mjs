import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone} from '../src/contact-validation.mjs';
test('phone input supports editable international codes and familiar Vietnamese formats',()=>{
 for(const value of ['0879089789','0879.089.789','84 879 089 789','+84 879 089 789','0084 879 089 789','+84 (0)879-089-789'])assert.equal(normalizePhone(value),'+84879089789');
 assert.equal(normalizePhone('+1 (202) 555-0123'),'+12025550123');
 assert.equal(normalizePhone('+44 20 7946 0018'),'+442079460018');
 assert.equal(normalizePhone('024 1234 5678'),'+842412345678');
 for(const value of ['+84','abc','+84 call me','++84879089789','+0123456789','+1234567890123456','',null])assert.equal(normalizePhone(value),null);
});
