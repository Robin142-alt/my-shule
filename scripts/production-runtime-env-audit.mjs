import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function runtimeEnvironmentReport(readiness){
  const env=readiness?.production_env;
  if(!env||env.node_env!=='production'||!Number.isInteger(env.issue_count)||!Number.isInteger(env.missing_count)||!Number.isInteger(env.invalid_count)
    ||env.issue_count!==env.missing_count+env.invalid_count) throw new Error('The deployed API did not return a complete production environment audit');
  return {ok:env.status==='configured'&&env.issue_count===0,generated_at:new Date().toISOString(),source:'deployed-api',
    env_file_order:[],loaded_files:[],summary:{missing:env.missing_count,invalid:env.invalid_count,total:env.issue_count},
    issues:(env.issues??[]).map(message=>({type:'runtime',message}))};
}
async function main(){
  const url=new URL('/health/ready',process.env.MYSHULE_API_URL??'https://my-shule-api-production.up.railway.app');
  if(url.protocol!=='https:') throw new Error('Production environment checks require HTTPS');
  const response=await fetch(url,{signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new Error(`API environment check returned HTTP ${response.status}`);
  const report=runtimeEnvironmentReport(await response.json());
  mkdirSync('docs/validation',{recursive:true});writeFileSync('docs/validation/production-env-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
