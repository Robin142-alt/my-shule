type StoredValue = {
  value: string;
  expires_at: number | null;
};

class InMemoryRedisMulti {
  private readonly operations: Array<() => Promise<unknown>> = [];

  constructor(private readonly client: InMemoryRedis) {}

  set(key: string, value: string, mode?: string, ttlSeconds?: number): this {
    this.operations.push(() => this.client.set(key, value, mode, ttlSeconds));
    return this;
  }

  async exec(): Promise<Array<[null, unknown]>> {
    const results: Array<[null, unknown]> = [];

    for (const operation of this.operations) {
      results.push([null, await operation()]);
    }

    return results;
  }

  sadd(key: string, ...members: string[]): this {
    this.operations.push(() => this.client.sadd(key, ...members));
    return this;
  }
}

export class InMemoryRedis {
  private readonly store = new Map<string, StoredValue>();
  private readonly sets = new Map<string, Set<string>>();

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    this.sets.clear();
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    this.evictIfExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    ttlSeconds?: number,
  ): Promise<'OK'> {
    const normalizedMode = typeof mode === 'string' ? mode.toUpperCase() : undefined;
    const expiresAt =
      normalizedMode === 'EX' && typeof ttlSeconds === 'number'
        ? Date.now() + ttlSeconds * 1000
        : null;

    this.store.set(key, {
      value,
      expires_at: expiresAt,
    });

    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deletedFromStore = this.store.delete(key) ? 1 : 0;
    const deletedFromSets = this.sets.delete(key) ? 1 : 0;
    return deletedFromStore || deletedFromSets ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    this.evictIfExpired(key);
    const existingValue = this.store.get(key);
    const currentValue = existingValue ? Number(existingValue.value) : 0;
    const nextValue = currentValue + 1;

    this.store.set(key, {
      value: String(nextValue),
      expires_at: existingValue?.expires_at ?? null,
    });

    return nextValue;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    this.evictIfExpired(key);
    const existingValue = this.store.get(key);

    if (!existingValue) {
      return 0;
    }

    existingValue.expires_at = Date.now() + ttlSeconds * 1000;
    this.store.set(key, existingValue);
    return 1;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const targetSet = this.sets.get(key) ?? new Set<string>();
    let insertedCount = 0;

    for (const member of members) {
      if (!targetSet.has(member)) {
        targetSet.add(member);
        insertedCount += 1;
      }
    }

    this.sets.set(key, targetSet);
    return insertedCount;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const targetSet = this.sets.get(key);

    if (!targetSet) {
      return 0;
    }

    let removedCount = 0;

    for (const member of members) {
      if (targetSet.delete(member)) {
        removedCount += 1;
      }
    }

    if (targetSet.size === 0) {
      this.sets.delete(key);
    } else {
      this.sets.set(key, targetSet);
    }

    return removedCount;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? new Set<string>())];
  }

  async watch(..._keys: string[]): Promise<'OK'> {
    return 'OK';
  }

  // Atomic compare-and-set used by SessionService; real Redis behavior is
  // covered separately by persistent-session.test.ts.
  async eval(script: string, keyCount: number, ...args: Array<string | number>): Promise<number> {
    const key = String(args[0]);
    const values = args.slice(keyCount);
    this.evictIfExpired(key);
    if (this.store.get(key)?.value !== values[0]) return 0;
    if (keyCount === 1 && script.includes("redis.call('DEL'")) {
      this.store.delete(key);
    } else if (keyCount === 2 && script.includes("redis.call('SET'")) {
      this.store.set(key, { value: String(values[1]), expires_at: Date.now() + Number(values[2]) * 1000 });
      this.store.set(String(args[1]), { value: String(values[3]), expires_at: Date.now() + Number(values[4]) * 1000 });
    } else {
      throw new Error('Unsupported Redis test script');
    }
    return 1;
  }

  async unwatch(): Promise<'OK'> {
    return 'OK';
  }

  multi(): InMemoryRedisMulti {
    return new InMemoryRedisMulti(this);
  }

  private evictIfExpired(key: string): void {
    const currentValue = this.store.get(key);

    if (currentValue?.expires_at && currentValue.expires_at <= Date.now()) {
      this.store.delete(key);
    }
  }
}
