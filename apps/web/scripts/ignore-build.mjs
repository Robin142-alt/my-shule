import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Vercel uses 0 = skip, 1 = build. Uncertain inputs always build.
// Ignore only independent backend/documentation trees. Unknown files, web
// changes, lockfiles, shared code, and configuration always rebuild.
export function onlyIndependentChanges(files) {
  return files.length > 0 && files.every((file) =>
    ['apps/api/', 'apps/malware-scanner/', 'apps/sms-relay/', 'prisma/', 'docs/']
      .some((prefix) => file.startsWith(prefix)),
  );
}

export function shouldSkipBuild({ env = process.env, cwd = process.cwd() } = {}) {
  const base = env.VERCEL_GIT_PREVIOUS_SHA;
  const head = env.VERCEL_GIT_COMMIT_SHA;
  if (env.MYSHULE_FORCE_WEB_BUILD === '1') return false;
  if (!base || !head || base === head) return false;
  if (![base, head].every((sha) => /^[a-f0-9]{40}$/i.test(sha))) return false;

  try {
    // Compare the last successful deployment, not HEAD^: a failed web build
    // followed by an API fix still needs to release the outstanding web change.
    const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
    execFileSync('git', ['merge-base', '--is-ancestor', base, head], { cwd: repository, stdio: 'pipe' });
    const files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head, '--'], {
      cwd: repository,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    }).split('\0').filter(Boolean);
    return onlyIndependentChanges(files);
  } catch {
    // Shallow clones may lack the baseline. Do not guess or fetch.
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const skip = shouldSkipBuild();
  console.log(skip ? 'Skipping web build: only independent backend/docs changed.' : 'Building web: changed or unverified deployment inputs.');
  process.exitCode = skip ? 0 : 1;
}
