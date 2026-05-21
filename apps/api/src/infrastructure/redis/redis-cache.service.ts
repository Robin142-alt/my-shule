import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from './redis.service';

/**
 * Tenant-aware Redis cache service.
 *
 * All cache keys are automatically namespaced by tenant_id to prevent
 * cross-tenant data leakage. Keys use the format:
 *   cache:{tenant_id}:{namespace}:{key}
 *
 * Cache operations gracefully degrade — a Redis failure will NOT break
 * the request flow; it will simply bypass the cache.
 */
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private static readonly KEY_PREFIX = 'cache';
  private static readonly LOCK_PREFIX = 'cache-lock';
  private readonly pendingComputations = new Map<string, Promise<unknown>>();

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get a cached value. Returns null on miss or Redis failure.
   */
  async get<T>(tenantId: string, namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(tenantId, namespace, key);
      const raw = await this.redisService.getClient().get(cacheKey);

      if (raw === null) {
        return null;
      }

      const parsed = JSON.parse(raw) as T | StaleWhileRevalidateEnvelope<T>;

      if (isStaleWhileRevalidateEnvelope<T>(parsed)) {
        return parsed.value;
      }

      return parsed as T;
    } catch (error) {
      this.logger.warn(
        `Cache GET failed for ${namespace}:${key} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Set a cached value with TTL in seconds.
   */
  async set<T>(
    tenantId: string,
    namespace: string,
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(tenantId, namespace, key);
      await this.redisService.getClient().set(cacheKey, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Cache SET failed for ${namespace}:${key} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a cached value, or compute it and cache it if not found.
   * This is the primary API for read-through caching.
   */
  async getOrSet<T>(
    tenantId: string,
    namespace: string,
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(tenantId, namespace, key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(tenantId, namespace, key, value, ttlSeconds);

    return value;
  }

  /**
   * Get a cached value, or compute it with in-process and Redis lock protection.
   *
   * This is intended for hot dashboard/read-model paths where a cache expiry could
   * otherwise create a stampede of identical database queries.
   */
  async getOrSetProtected<T>(
    tenantId: string,
    namespace: string,
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    options: { lockTtlSeconds?: number } = {},
  ): Promise<T> {
    const cacheKey = this.buildKey(tenantId, namespace, key);
    const pending = this.pendingComputations.get(cacheKey);

    if (pending) {
      return pending as Promise<T>;
    }

    const operation = this.computeWithStampedeProtection(
      tenantId,
      namespace,
      key,
      ttlSeconds,
      factory,
      options.lockTtlSeconds ?? 5,
    );

    this.pendingComputations.set(cacheKey, operation as Promise<unknown>);

    try {
      return await operation;
    } finally {
      this.pendingComputations.delete(cacheKey);
    }
  }

  /**
   * Stale-while-revalidate read-through caching.
   *
   * Fresh values are returned immediately. Stale values are returned immediately
   * too, while a single protected refresh runs in the background.
   */
  async getOrSetStaleWhileRevalidate<T>(
    tenantId: string,
    namespace: string,
    key: string,
    options: {
      freshTtlSeconds: number;
      staleTtlSeconds: number;
      lockTtlSeconds?: number;
    },
    factory: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();
    const swrKey = `swr:${key}`;
    const cacheKey = this.buildKey(tenantId, namespace, swrKey);
    const lockTtlSeconds = options.lockTtlSeconds ?? 5;

    try {
      const raw = await this.redisService.getClient().get(cacheKey);
      const envelope = raw ? JSON.parse(raw) as StaleWhileRevalidateEnvelope<T> : null;

      if (envelope && envelope.fresh_until_ms > now) {
        return envelope.value;
      }

      if (envelope && envelope.stale_until_ms > now) {
        void this.refreshStaleWhileRevalidateValue(
          tenantId,
          namespace,
          swrKey,
          options.freshTtlSeconds,
          options.staleTtlSeconds,
          lockTtlSeconds,
          factory,
        );
        return envelope.value;
      }

      return await this.refreshStaleWhileRevalidateValue(
        tenantId,
        namespace,
        swrKey,
        options.freshTtlSeconds,
        options.staleTtlSeconds,
        lockTtlSeconds,
        factory,
      );
    } catch (error) {
      this.logger.warn(
        `Cache staleWhileRevalidate failed for ${namespace}:${key} - ${error instanceof Error ? error.message : String(error)}`,
      );
      return factory();
    }
  }

  /**
   * Invalidate a specific cache key.
   */
  async invalidate(tenantId: string, namespace: string, key: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(tenantId, namespace, key);
      await this.redisService.getClient().del(cacheKey);
    } catch (error) {
      this.logger.warn(
        `Cache DEL failed for ${namespace}:${key} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Invalidate all cache keys for a tenant within a namespace.
   * Uses SCAN to avoid blocking Redis.
   */
  async invalidateNamespace(tenantId: string, namespace: string): Promise<number> {
    try {
      const pattern = `${RedisCacheService.KEY_PREFIX}:${tenantId}:${namespace}:*`;
      const client = this.redisService.getClient();
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      this.logger.warn(
        `Cache namespace invalidation failed for ${namespace} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * Batch get multiple keys in a single Redis MGET call.
   */
  async mget<T>(
    tenantId: string,
    namespace: string,
    keys: string[],
  ): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map();
    }

    try {
      const cacheKeys = keys.map((key) => this.buildKey(tenantId, namespace, key));
      const values = await this.redisService.getClient().mget(...cacheKeys);
      const result = new Map<string, T>();

      for (let i = 0; i < keys.length; i++) {
        const raw = values[i];

        if (raw !== null) {
          try {
            result.set(keys[i], JSON.parse(raw) as T);
          } catch {
            // Skip entries with parse errors
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Cache MGET failed for ${namespace} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return new Map();
    }
  }

  private buildKey(tenantId: string, namespace: string, key: string): string {
    return `${RedisCacheService.KEY_PREFIX}:${tenantId}:${namespace}:${key}`;
  }

  private buildLockKey(tenantId: string, namespace: string, key: string): string {
    return `${RedisCacheService.LOCK_PREFIX}:${tenantId}:${namespace}:${key}`;
  }

  private async computeWithStampedeProtection<T>(
    tenantId: string,
    namespace: string,
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    lockTtlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(tenantId, namespace, key);

    if (cached !== null) {
      return cached;
    }

    const lockKey = this.buildLockKey(tenantId, namespace, key);
    const lockValue = `${Date.now()}:${Math.random()}`;
    const acquired = await this.tryAcquireLock(lockKey, lockValue, lockTtlSeconds);

    try {
      if (acquired) {
        const cachedAfterLock = await this.get<T>(tenantId, namespace, key);

        if (cachedAfterLock !== null) {
          return cachedAfterLock;
        }
      }

      const value = await factory();
      await this.set(tenantId, namespace, key, value, ttlSeconds);
      return value;
    } finally {
      if (acquired) {
        await this.releaseLock(lockKey);
      }
    }
  }

  private async refreshStaleWhileRevalidateValue<T>(
    tenantId: string,
    namespace: string,
    swrKey: string,
    freshTtlSeconds: number,
    staleTtlSeconds: number,
    lockTtlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.buildKey(tenantId, namespace, swrKey);
    const pending = this.pendingComputations.get(cacheKey);

    if (pending) {
      return pending as Promise<T>;
    }

    const operation = (async () => {
      const lockKey = this.buildLockKey(tenantId, namespace, swrKey);
      const lockValue = `${Date.now()}:${Math.random()}`;
      const acquired = await this.tryAcquireLock(lockKey, lockValue, lockTtlSeconds);

      try {
        const value = await factory();
        const now = Date.now();
        const envelope: StaleWhileRevalidateEnvelope<T> = {
          value,
          fresh_until_ms: now + freshTtlSeconds * 1000,
          stale_until_ms: now + staleTtlSeconds * 1000,
        };
        await this.redisService
          .getClient()
          .set(cacheKey, JSON.stringify(envelope), 'EX', staleTtlSeconds);
        return value;
      } finally {
        if (acquired) {
          await this.releaseLock(lockKey);
        }
      }
    })();

    this.pendingComputations.set(cacheKey, operation as Promise<unknown>);

    try {
      return await operation;
    } finally {
      this.pendingComputations.delete(cacheKey);
    }
  }

  private async tryAcquireLock(
    lockKey: string,
    lockValue: string,
    lockTtlSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.redisService
        .getClient()
        .set(lockKey, lockValue, 'EX', lockTtlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(
        `Cache stampede lock failed for ${lockKey} - ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redisService.getClient().del(lockKey);
    } catch (error) {
      this.logger.warn(
        `Cache stampede lock release failed for ${lockKey} - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

interface StaleWhileRevalidateEnvelope<T> {
  value: T;
  fresh_until_ms: number;
  stale_until_ms: number;
}

function isStaleWhileRevalidateEnvelope<T>(
  value: unknown,
): value is StaleWhileRevalidateEnvelope<T> {
  return Boolean(
    value
      && typeof value === 'object'
      && 'value' in value
      && 'fresh_until_ms' in value
      && 'stale_until_ms' in value,
  );
}
