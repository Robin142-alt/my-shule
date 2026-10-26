import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseStatus, fetchReleaseStatuses} from './verify-railway-release.mjs';
const statuses=[['my-shule-api','62241841-a98c-4058-b0af-bae872ed4929'],['payments-worker','09e0ce9a-9281-4481-a150-837c7ae0a460']].map(([name,id])=>({
  context:`striking-energy - ${name}`,creator:{login:'railway-app[bot]'},target_url:`https://railway.com/project/project/service/${id}`,state:'success'}));
test('web release waits for both independently reported services at the same commit',()=>{
  assert.deepEqual(releaseStatus({sha:'release',statuses},'release'),[]);
  assert.equal(releaseStatus({sha:'release',statuses:statuses.slice(0,1)},'release').length,1);
  assert.throws(()=>releaseStatus({sha:'old',statuses},'release'),/another commit/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:[{...statuses[0],state:'failure'}]},'release'),/failed/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:[{...statuses[0],creator:{login:'other'}}]},'release'),/Untrusted/);
});
test('release lookup uses full commit statuses with Railway creator identity',async()=>{
  const sha='6e8376d60e92d55c81fd49a6303c48117057bd99';
  const payload=await fetchReleaseStatuses({repo:'Robin142-alt/my-shule',sha,token:'test-token'},async(url,options)=>{
    assert.equal(url,`https://api.github.com/repos/Robin142-alt/my-shule/commits/${sha}/statuses?per_page=100`);
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return {ok:true,json:async()=>statuses};
  });
  assert.deepEqual(releaseStatus(payload,sha),[]);
});
test('new pending deployment cannot be masked by an older successful status',()=>{
  assert.deepEqual(releaseStatus({sha:'release',statuses:[{...statuses[0],state:'pending'},...statuses]},'release'),['striking-energy - my-shule-api']);
});
test('release lookup fails closed for mutable refs, lookup failures and combined status responses',async()=>{
  const identity={repo:'Robin142-alt/my-shule',sha:'a'.repeat(40),token:'test-token'};
  await assert.rejects(fetchReleaseStatuses({...identity,sha:'main'},()=>assert.fail('must not fetch a mutable ref')),/identity/);
  await assert.rejects(fetchReleaseStatuses(identity,async()=>({ok:false,status:403})),/HTTP 403/);
  await assert.rejects(fetchReleaseStatuses(identity,async()=>({ok:true,json:async()=>({sha:identity.sha,statuses})})),/status list/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:statuses.map(({creator,...row})=>row)},'release'),/Untrusted/);
  assert.throws(()=>releaseStatus({sha:'release',statuses:[{...statuses[0],target_url:statuses[0].target_url.replace('https:','http:')}]},'release'),/Untrusted/);
});
