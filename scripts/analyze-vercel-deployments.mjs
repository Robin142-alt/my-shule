import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { shouldSkipBuild } from '../apps/web/scripts/ignore-build.mjs';

// Read-only replay against a Vercel deployment-list JSON export and local Git
// history. No network requests, deployments or deletion operations are made.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/analyze-vercel-deployments.mjs <deployments.json>');
const payload = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
const deployments = (Array.isArray(payload) ? payload : payload.deployments)
  .filter((deployment) => (deployment.readyState ?? deployment.state) === 'READY')
  .sort((a, b) => a.created - b.created);
const baselines = new Map();
const byDay = {};
const treeHashes = new Set();
const inventory = deployments.map((deployment) => {
  const sha = deployment.meta?.githubCommitSha ?? deployment.gitSource?.sha;
  const branch = deployment.meta?.githubCommitRef ?? deployment.gitSource?.ref;
  const target = deployment.target ?? 'preview';
  const date = new Date(deployment.created).toISOString();
  byDay[date.slice(0, 10)] = (byDay[date.slice(0, 10)] ?? 0) + 1;
  let webTree = null;
  if (/^[a-f0-9]{40}$/i.test(sha ?? '')) {
    try {
      webTree = execFileSync('git', ['rev-parse', `${sha}:apps/web`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      treeHashes.add(webTree);
    } catch { /* Missing history is not evidence of duplicate output. */ }
  }
  const key = `${branch}:${target}`;
  const skip = Boolean(branch && shouldSkipBuild({
    env: { VERCEL_GIT_PREVIOUS_SHA: baselines.get(key), VERCEL_GIT_COMMIT_SHA: sha },
  }));
  if (!skip && branch && sha) baselines.set(key, sha);
  return {
    id: deployment.uid,
    date,
    sha,
    branch,
    target,
    webTree,
    buildIntervalSeconds: Math.max(0, ((deployment.ready ?? 0) - (deployment.buildingAt ?? 0)) / 1000),
    wouldSkip: skip,
  };
});
const skipped = inventory.filter((deployment) => deployment.wouldSkip);
console.log(JSON.stringify({
  methodology: 'Replay last retained successful deployment per branch and target; skipped releases do not advance the baseline. Full local Git history; Vercel shallow history may reduce savings. These are review candidates, not authorized deletions.',
  successfulDeployments: inventory.length,
  knownWebTrees: inventory.filter((deployment) => deployment.webTree).length,
  uniqueWebTrees: treeHashes.size,
  skipped: skipped.length,
  futureBuildsInReplay: inventory.length - skipped.length,
  avoidedBuildIntervalSeconds: skipped.reduce((total, deployment) => total + deployment.buildIntervalSeconds, 0),
  successfulDeploymentsByUtcDay: byDay,
  deployments: inventory,
}, null, 2));
