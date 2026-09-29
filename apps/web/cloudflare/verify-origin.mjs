import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Harmless liveness requests verify both key agreement and deployed verification.
// An old API accepts both probes; a mismatched key rejects both. Neither is safe.
export async function verifyOriginIdentity(baseUrl, secret, fetcher = fetch) {
  assert.ok(secret?.length >= 32, 'Missing gateway identity deployment secret');
  const ip = '192.0.2.1';
  const agent = 'MyShule deployment verification';
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify(['v1', ip, agent, timestamp])).digest('hex');
  const headers = {
    'user-agent': agent, 'x-myshule-client-ip': ip,
    'x-myshule-client-time': timestamp, 'x-myshule-client-signature': signature,
  };
  const accepted = await fetcher(new URL('/health', baseUrl), {
    headers, redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  assert.equal(accepted.status, 200, 'API must accept correctly signed identity');
  assert.equal((await accepted.json()).status, 'ok', 'API liveness');
  const rejected = await fetcher(new URL('/health', baseUrl), {
    headers: { ...headers, 'x-myshule-client-signature': 'invalid' },
    redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  assert.equal(rejected.status, 401, 'API must reject forged identity before Worker rollout');
  assert.equal((await rejected.json()).message, 'Invalid gateway identity');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.SERVER_API_BASE_URL;
  assert.ok(base && new URL(base).protocol === 'https:', 'Set an HTTPS API origin');
  const secret = process.env.GATEWAY_IDENTITY_SECRET;
  assert.ok(secret?.length >= 32, 'Missing gateway identity deployment secret');
  let verified = false;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await verifyOriginIdentity(base, secret);
      verified = true;
      console.log('API accepts signed identity and rejects forgeries.');
      break;
    } catch {
      console.log(`Waiting for compatible API deployment (${attempt}/30).`);
      if (attempt < 30) await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
  assert.ok(verified, 'API identity verification failed; Worker deployment blocked');
}
