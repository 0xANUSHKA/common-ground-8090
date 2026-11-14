import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCompany} from '../extension/src/company-context.js';
test('multiple company memberships require an explicit choice regardless of Redis ordering',()=>{
 const old={id:'ulysses',kind:'company'},own={id:'optivolt',kind:'company'},fund={id:'fund',kind:'fund'};
 assert.equal(chooseCompany([old,own,fund]),'');
 assert.equal(chooseCompany([own,old,fund]),'');
 assert.equal(chooseCompany([old,own],'optivolt'),'optivolt');
 assert.equal(chooseCompany([own,old],'optivolt'),'optivolt');
 assert.equal(chooseCompany([old,own],'deleted-company'),'');
 assert.equal(chooseCompany([own,fund]),'optivolt');
 assert.equal(chooseCompany([fund],'optivolt'),'');
});
