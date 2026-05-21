import assert from 'node:assert/strict';
import test from 'node:test';

import { RedisCacheService } from './redis-cache.service';

class FakeRedisClient {
  readonly store = new Map<string, string>();
  private readonly expiry = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    this.evictExpired(key);
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: string, ttlOrCondition?: number | 'NX', condition?: 'NX'): Promise<'OK' | null> {
    const wantsNx = ttlOrCondition === 'NX' || condition === 'NX';

    if (wantsNx && this.store.has(key)) {
      return null;
    }

    this.store.set(key, value);

    if (mode === 'EX' && typeof ttlOrCondition === 'number') {
      this.expiry.set(key, Date.now() + ttlOrCondition * 1000);
    }

    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      deleted += this.store.delete(key) ? 1 : 0;
      this.expiry.delete(key);
    }

    return deleted;
  }

  async scan(cursor: string, _match: 'MATCH', pattern: string): Promise<[string, string[]]> {
    const prefix = pattern.replace(/\*$/, '');
    const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
    return [cursor === '0' ? '0' : '0', keys];
  }

  async mget(...keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  private evictExpired(key: string): void {
    const expiresAt = this.expiry.get(key);

    if (expiresAt && expiresAt <= Date.now()) {
      this.store.delete(key);
      this.expiry.delete(key);
    }
  }
}

const createService = (client: FakeRedisClient): RedisCacheService =>
  new RedisCacheService({ getClient: () => client } as never);

test('getOrSetProtected deduplicates concurrent cache misses to prevent stampedes', async () => {
  const client = new FakeRedisClient();
  const service = createService(client);
  let factoryCalls = 0;

  const [first, second, third] = await Promise.all([
    service.getOrSetProtected('tenant-a', 'dashboard:principal', 'today', 60, async () => {
      factoryCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 'fresh' };
    }),
    service.getOrSetProtected('tenant-a', 'dashboard:principal', 'today', 60, async () => {
      factoryCalls += 1;
      return { status: 'duplicate' };
    }),
    service.getOrSetProtected('tenant-a', 'dashboard:principal', 'today', 60, async () => {
      factoryCalls += 1;
      return { status: 'duplicate' };
    }),
  ]);

  assert.deepEqual(first, { status: 'fresh' });
  assert.deepEqual(second, { status: 'fresh' });
  assert.deepEqual(third, { status: 'fresh' });
  assert.equal(factoryCalls, 1);
});

test('getOrSetStaleWhileRevalidate returns stale data quickly and refreshes in the background', async () => {
  const client = new FakeRedisClient();
  const service = createService(client);
  let factoryCalls = 0;

  assert.deepEqual(
    await service.getOrSetStaleWhileRevalidate(
      'tenant-a',
      'billing:balances',
      'summary',
      { freshTtlSeconds: 1, staleTtlSeconds: 60, lockTtlSeconds: 5 },
      async () => {
        factoryCalls += 1;
        return { version: 1 };
      },
    ),
    { version: 1 },
  );

  const cacheKey = 'cache:tenant-a:billing:balances:swr:summary';
  client.store.set(
    cacheKey,
    JSON.stringify({
      value: { version: 1 },
      fresh_until_ms: Date.now() - 1000,
      stale_until_ms: Date.now() + 60000,
    }),
  );

  const stale = await service.getOrSetStaleWhileRevalidate(
    'tenant-a',
    'billing:balances',
    'summary',
    { freshTtlSeconds: 30, staleTtlSeconds: 60, lockTtlSeconds: 5 },
    async () => {
      factoryCalls += 1;
      return { version: 2 };
    },
  );

  assert.deepEqual(stale, { version: 1 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const refreshed = await service.get<{ version: number }>('tenant-a', 'billing:balances', 'swr:summary');
  assert.deepEqual(refreshed, { version: 2 });
  assert.equal(factoryCalls, 2);
});
