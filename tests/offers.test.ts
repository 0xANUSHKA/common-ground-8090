import test from 'node:test';
import assert from 'node:assert/strict';
import {newOffers} from '../extension/src/offers.js';
test('notifications start quiet, deduplicate grants, and identify new versions',()=>{
  const a={tool:{id:'one',hash:'v1',name:'Check'},owner:{name:'Engineer'}};
  const first=newOffers(null,[a]); assert.equal(first.fresh.length,0);
  assert.equal(newOffers(first.current,[a,a]).fresh.length,0);
  const b={...a,tool:{...a.tool,hash:'v2'}};
  assert.equal(newOffers(first.current,[b,b]).fresh.length,1);
  assert.equal(newOffers(first.current,[]).current.size,0);
  assert.equal(newOffers(null,[b]).fresh.length,0,'new session establishes a new baseline');
});
