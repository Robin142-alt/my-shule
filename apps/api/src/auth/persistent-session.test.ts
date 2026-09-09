import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { regularSessionExpiresAt, REGULAR_SESSION_TTL_SECONDS } from './session-policy';
import type { RedisService } from '../infrastructure/redis/redis.service';

const config = new ConfigService({ auth: {
  accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2592000,
  accessTokenSecret: 'persistent-login-test-access-secret',
  refreshTokenSecret: 'persistent-login-test-refresh-secret', issuer: 'test', audience: 'test',
} });
const tokens = new TokenService(new JwtService(), config);
let redis: Redis;
let processHandle: ChildProcess;
let sessions: SessionService;

before(async () => {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  processHandle = spawn('redis-server', ['--bind', '127.0.0.1', '--port', String(port), '--save', '', '--appendonly', 'no'], {
    windowsHide: true, stdio: 'ignore',
  });
  let startError: Error | undefined;
  processHandle.on('error', error => { startError = error; });
  redis = new Redis(port, '127.0.0.1', { lazyConnect: true, retryStrategy: () => null });
  redis.on('error', () => undefined);
  for (let attempt = 0; attempt < 30; attempt++) {
    if (startError) throw startError;
    try { await redis.connect(); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  await redis.ping();
  sessions = new SessionService({ isDegraded: () => false, getClient: () => redis } as unknown as RedisService, config);
});

after(async () => {
  if (redis?.status === 'ready') await redis.quit();
  processHandle?.kill();
});

async function login(audience: 'school' | 'portal' | 'superadmin' = 'school') {
  const subject = { audience, user_id: randomUUID(), tenant_id: audience === 'superadmin' ? null : randomUUID(), role: audience === 'portal' ? 'parent' : 'teacher', session_id: randomUUID() };
  const pair = await tokens.issueTokenPair(subject);
  const session = await sessions.createSession({ ...subject, permissions: ['auth:read'], is_authenticated: true,
    email_verified_at: new Date().toISOString(), refresh_token_id: pair.refresh_token_id,
    refresh_expires_at: pair.refresh_expires_at, ip_address: '127.0.0.1', user_agent: 'test-browser',
  });
  return { pair, session, subject };
}

test('regular school and portal logins have 14-day refresh and 15-minute access tokens', async () => {
  for (const audience of ['school', 'portal'] as const) {
    const { pair } = await login(audience);
    assert.equal(pair.refresh_expires_in, REGULAR_SESSION_TTL_SECONDS);
    assert.equal(pair.access_expires_in, 900);
    await tokens.verifyRefreshToken(pair.refresh_token);
    await assert.rejects(tokens.verifyAccessToken(pair.refresh_token));
  }
});

test('refresh and role switching cannot move the original absolute deadline', async () => {
  const { subject } = await login();
  const deadline = new Date(Date.now() + 45_000).toISOString();
  const pair = await tokens.issueTokenPair({ ...subject, role: 'class_teacher', session_expires_at: deadline });
  assert.ok(pair.refresh_expires_in <= 45);
  assert.ok(pair.access_expires_in <= 45);
  assert.ok(Date.parse(pair.refresh_expires_at) <= Date.parse(deadline) + 1000);
  await assert.rejects(tokens.issueTokenPair({ ...subject, session_expires_at: new Date(Date.now() - 1000).toISOString() }));
});

test('Super Admin continues to use the configured 30-day refresh lifetime', async () => {
  const { subject, pair } = await login('superadmin');
  assert.equal(pair.refresh_expires_in, 2592000);
  const refreshed = await tokens.issueTokenPair({ ...subject, session_expires_at: new Date(0).toISOString() });
  assert.equal(refreshed.refresh_expires_in, 2592000);
  assert.equal(refreshed.access_expires_in, 900);
});

test('20 simultaneous refreshes on real Redis return one winning pair; replay then logout cannot resurrect it', async () => {
  const { subject, session, pair } = await login();
  const rotate = async () => sessions.rotateRefreshToken({
    session_id: session.session_id, current_refresh_token_id: pair.refresh_token_id,
    next_token_pair: await tokens.issueTokenPair({ ...subject, session_expires_at: regularSessionExpiresAt(session) }),
    role: session.role, permissions: session.permissions, email_verified_at: session.email_verified_at,
    ip_address: session.ip_address, user_agent: session.user_agent,
  });
  const results = await Promise.all(Array.from({ length: 20 }, rotate));
  assert.equal(results.filter(result => !result.replayed).length, 1);
  assert.equal(new Set(results.map(result => result.token_pair.refresh_token)).size, 1);
  assert.ok(Date.parse((await sessions.getSession(session.session_id))!.refresh_expires_at) <= Date.parse(session.refresh_expires_at));
  await sessions.invalidateSession(session.session_id);
  await assert.rejects(rotate());
  assert.equal(await sessions.getSession(session.session_id), null);
});

test('reusing an older refresh token from a different client revokes its family', async () => {
  const { subject, session, pair } = await login();
  const input = { session_id: session.session_id, current_refresh_token_id: pair.refresh_token_id,
    next_token_pair: await tokens.issueTokenPair({ ...subject, session_expires_at: regularSessionExpiresAt(session) }),
    role: session.role, permissions: session.permissions, email_verified_at: session.email_verified_at,
    ip_address: session.ip_address, user_agent: session.user_agent };
  await sessions.rotateRefreshToken(input);
  await assert.rejects(sessions.rotateRefreshToken({ ...input, user_agent: 'different-browser' }), /reuse detected/);
  assert.equal(await sessions.getSession(session.session_id), null);
});

test('legacy regular sessions over 14 days are rejected even if the Redis key survives', async () => {
  const { session } = await login();
  session.created_at = new Date(Date.now() - 15 * 86400000).toISOString();
  await redis.set(`auth:session:${session.session_id}`, JSON.stringify(session), 'EX', 1000);
  assert.equal(await sessions.getSession(session.session_id), null);
});

test('production does not issue ephemeral regular sessions when Redis is unavailable', async () => {
  const previous = process.env.NODE_ENV;
  const degraded = new SessionService({ isDegraded: () => true } as unknown as RedisService, config);
  const { session } = await login();
  try {
    process.env.NODE_ENV = 'production';
    await assert.rejects(degraded.createSession(session), /temporarily unavailable/);
    await assert.rejects(degraded.getSession(session.session_id, 'school'), /temporarily unavailable/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
