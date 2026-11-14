import test from 'node:test';
import assert from 'node:assert/strict';
import { readClaudeResult } from '../server/claude-builder.js';

test('Claude CLI result surfaces authentication failures carried on stdout', () => {
  assert.throws(() => readClaudeResult(JSON.stringify({type:'result', subtype:'success', is_error:true, result:'Failed to authenticate. API Error: 401 OAuth access token is invalid.'}), '', 1), /claude auth login/);
  assert.equal(readClaudeResult(JSON.stringify({is_error:false,result:'function inspect() {}'}),'',0),'function inspect() {}');
  assert.throws(() => readClaudeResult(JSON.stringify({is_error:false,result:'not a successful process'}),'',1), /could not complete/);
  assert.throws(() => readClaudeResult('not JSON','sensitive diagnostic',1), /unreadable response/);
  assert.throws(() => readClaudeResult(JSON.stringify({is_error:true,result:'usage limit reached'}),'',1), /usage limit/);
});
