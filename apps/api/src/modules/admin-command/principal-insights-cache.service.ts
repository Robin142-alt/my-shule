import { Injectable } from '@nestjs/common';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class PrincipalInsightsCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const existing = this.entries.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (existing && existing.expiresAt > now) {
      return existing.value;
    }

    const value = await factory();
    this.entries.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });

    return value;
  }

  invalidateTenant(tenantId: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.entries.delete(key);
      }
    }
  }
}
