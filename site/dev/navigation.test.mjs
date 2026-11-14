import test from 'node:test';
import assert from 'node:assert/strict';
// Exercise the actual public-header renderer; unauthenticated API is the only mocked boundary.
const oldFetch = globalThis.fetch;
let element = null;
globalThis.document = { querySelector: () => element, querySelectorAll: () => [] };
globalThis.fetch = async () => new Response('{"error":"Sign in"}', { status:401 });
const { navUser } = await import('../nav.js');

test('header sign-in preserves an invitation instead of returning to an existing dashboard', async () => {
  element = { dataset:{root:'../'}, innerHTML:'' };
  globalThis.location = new URL('https://common-ground.test/join/?invite=fresh-company-link');
  await navUser();
  const href = element.innerHTML.match(/class="nav-link" href="([^"]+)"/)[1];
  const signIn = new URL(href, location);
  assert.equal(signIn.pathname, '/signin/');
  assert.equal(signIn.searchParams.get('next'), '/join/?invite=fresh-company-link');
  // Also verify the route survives the same signed OAuth state used by Google sign-in.
  process.env.SESSION_SECRET = 'local-navigation-regression-test-only';
  const { googleStart, unseal } = await import('../api/_auth.js');
  const headers = {};
  const res = { getHeader:k=>headers[k], setHeader:(k,v)=>headers[k]=v, end(){} };
  googleStart({headers:{host:'common-ground.test'}},res,signIn.searchParams.get('next'));
  const state=unseal(new URL(headers.Location).searchParams.get('state'));
  assert.equal(state.next, '/join/?invite=fresh-company-link');
});

test('ordinary header sign-in still goes to the dashboard', async () => {
  globalThis.location = new URL('https://common-ground.test/');
  element.dataset.root='./';
  await navUser();
  const href=element.innerHTML.match(/class="nav-link" href="([^"]+)"/)[1];
  assert.equal(new URL(href,location).searchParams.get('next'), '/dashboard/');
});

test.after(()=>{globalThis.fetch=oldFetch;delete globalThis.document;delete globalThis.location;});
