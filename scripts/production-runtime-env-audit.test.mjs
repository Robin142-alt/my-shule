import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeEnvironmentReport} from './production-runtime-env-audit.mjs';
test('audits the real runtime and fails closed for incomplete or non-production evidence',()=>{
  const production_env={status:'configured',node_env:'production',issue_count:0,missing_count:0,invalid_count:0,issues:[]};
  assert.equal(runtimeEnvironmentReport({production_env}).ok,true);
  assert.equal(runtimeEnvironmentReport({production_env:{...production_env,status:'invalid',issue_count:1,missing_count:1,issues:['JWT secret missing']}}).ok,false);
  assert.throws(()=>runtimeEnvironmentReport({}),/complete/);
  assert.throws(()=>runtimeEnvironmentReport({production_env:{...production_env,node_env:'development'}}),/complete/);
  assert.throws(()=>runtimeEnvironmentReport({production_env:{...production_env,issue_count:2}}),/complete/);
});
