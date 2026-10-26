import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseStatus} from './verify-railway-release.mjs';
const statuses=[['my-shule-api','62241841-a98c-4058-b0af-bae872ed4929'],['payments-worker','09e0ce9a-9281-4481-a150-837c7ae0a460']].map(([name,id])=>({
  context:`striking-energy - ${name}`,creator:{login:'railway-app[bot]'},target_url:`https://railway.com/project/project/service/${id}`,state:'success'}));
test('web release waits for both independently reported services at the same commit',()=>{
  assert.deepEqual(releaseStatus({sha:'release',statuses},'release'),[]);
  assert.equal(releaseStatus({sha:'release',statuses:statuses.slice(0,1)},'release').length,1);
  assert.throws(()=>releaseStatus({sha:'old',statuses},'release'),/another commit/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:[{...statuses[0],state:'failure'}]},'release'),/failed/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:[{...statuses[0],creator:{login:'other'}}]},'release'),/Untrusted/);
});
