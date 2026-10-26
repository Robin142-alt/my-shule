import {pathToFileURL} from 'node:url';

const services=new Map([
  ['striking-energy - my-shule-api','62241841-a98c-4058-b0af-bae872ed4929'],
  ['striking-energy - payments-worker','09e0ce9a-9281-4481-a150-837c7ae0a460'],
]);
export function releaseStatus(payload,sha){
  if(payload.sha!==sha) throw new Error('Deployment status belongs to another commit');
  const pending=[];
  for(const [name,id] of services){
    const status=payload.statuses?.find(row=>row.context===name);
    if(!status){pending.push(name);continue;}
    const target=new URL(status.target_url);
    if(status.creator?.login!=='railway-app[bot]'||target.protocol!=='https:'||target.hostname!=='railway.com'||!target.pathname.endsWith(`/service/${id}`))
      throw new Error(`Untrusted deployment status for ${name}`);
    if(['failure','error'].includes(status.state)) throw new Error(`Railway deployment failed: ${name}`);
    if(status.state!=='success')pending.push(name);
  }
  return pending;
}
export async function fetchReleaseStatuses({token,repo,sha},fetchImpl=fetch){
  if(!token||!/^[-\w.]+\/[-\w.]+$/.test(repo??'')||!/^[a-f0-9]{40}$/i.test(sha??''))
    throw new Error('Immutable GitHub release identity is required');
  // The combined /status response omits creator. Full statuses include the
  // publisher and are newest-first, so find() checks the latest service result.
  const response=await fetchImpl(`https://api.github.com/repos/${repo}/commits/${sha}/statuses?per_page=100`,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15_000)});
  if(!response.ok) throw new Error(`Deployment status lookup failed (HTTP ${response.status})`);
  const statuses=await response.json();
  if(!Array.isArray(statuses)) throw new Error('Invalid deployment status list');
  return {sha,statuses};
}
async function main(){
  const {GITHUB_TOKEN:token,GITHUB_REPOSITORY:repo,GITHUB_SHA:sha}=process.env;
  if(!token||!repo||!sha) throw new Error('GitHub release identity is required');
  const deadline=Date.now()+15*60_000;
  while(Date.now()<deadline){
    const pending=releaseStatus(await fetchReleaseStatuses({token,repo,sha}),sha);
    if(!pending.length){console.log(`API and payments worker deployed successfully at ${sha}`);return;}
    console.log(`Waiting for Railway: ${pending.join(', ')}`);
    await new Promise(resolve=>setTimeout(resolve,20_000));
  }
  throw new Error('API and payments worker did not reach the release commit before the deployment deadline');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
