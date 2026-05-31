import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { AUTH_ANONYMOUS_USER_ID } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

interface RateLimitPolicy {
  bucket: string;
  max_requests: number;
  window_seconds: number;
  rate_limit_class: RateLimitClass;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retry_after_seconds: number;
  reset_at: string;
  route_key: string;
  actor_key: string;
  total_hits: number;
  rate_limit_class: RateLimitClass;
  storage_mode: 'redis' | 'memory_fallback';
}

export type RateLimitClass =
  | 'public_read'
  | 'authenticated_read'
  | 'write'
  | 'auth'
  | 'payment_callback'
  | 'sync'
  | 'admin';

@Injectable()
export class RateLimitService {
  private readonly fallbackBuckets = new Map<string, { total_hits: number; expires_at_ms: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly redisService: RedisService,
  ) {}

  async evaluateRequest(request: Request): Promise<RateLimitDecision> {
    const requestContext = this.requestContext.requireStore();
    const routeKey = this.resolveRouteKey(request);
    const rateLimitClass = this.resolveRateLimitClass(request, routeKey);
    const policy = this.resolvePolicy(routeKey, rateLimitClass);
    const tenantId = requestContext.tenant_id ?? 'anonymous';
    const actorKey =
      requestContext.user_id && requestContext.user_id !== AUTH_ANONYMOUS_USER_ID
        ? `user:${requestContext.user_id}`
        : `ip:${requestContext.client_ip ?? 'unknown'}`;
    const bucketId = `${tenantId}:${routeKey}:${actorKey}`;

    return this.consume(policy, bucketId, routeKey, actorKey);
  }

  private async consume(
    policy: RateLimitPolicy,
    bucketId: string,
    routeKey: string,
    actorKey: string,
  ): Promise<RateLimitDecision> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowSlot = Math.floor(nowSeconds / policy.window_seconds);
    const redisKey = `rate-limit:${policy.bucket}:${bucketId}:${windowSlot}`;
    try {
      const redisClient = this.redisService.getClient();
      const totalHits = await redisClient.incr(redisKey);

      if (totalHits === 1) {
        await redisClient.expire(redisKey, policy.window_seconds);
      }

      const ttl = Math.max(await redisClient.ttl(redisKey), 1);
      return this.buildDecision(policy, routeKey, actorKey, totalHits, ttl, 'redis');
    } catch {
      return this.consumeFallback(policy, redisKey, routeKey, actorKey, nowSeconds);
    }
  }

  private consumeFallback(
    policy: RateLimitPolicy,
    bucketId: string,
    routeKey: string,
    actorKey: string,
    nowSeconds: number,
  ): RateLimitDecision {
    this.evictExpiredFallbackBuckets();

    const nowMs = nowSeconds * 1000;
    const existing = this.fallbackBuckets.get(bucketId);
    const bucket = existing && existing.expires_at_ms > nowMs
      ? existing
      : {
          total_hits: 0,
          expires_at_ms: nowMs + policy.window_seconds * 1000,
        };

    bucket.total_hits += 1;
    this.fallbackBuckets.set(bucketId, bucket);

    const ttl = Math.max(Math.ceil((bucket.expires_at_ms - nowMs) / 1000), 1);
    return this.buildDecision(
      policy,
      routeKey,
      actorKey,
      bucket.total_hits,
      ttl,
      'memory_fallback',
    );
  }

  private buildDecision(
    policy: RateLimitPolicy,
    routeKey: string,
    actorKey: string,
    totalHits: number,
    ttl: number,
    storageMode: RateLimitDecision['storage_mode'],
  ): RateLimitDecision {
    const nowSeconds = Math.floor(Date.now() / 1000);

    return {
      allowed: totalHits <= policy.max_requests,
      limit: policy.max_requests,
      remaining: Math.max(policy.max_requests - totalHits, 0),
      retry_after_seconds: ttl,
      reset_at: new Date((nowSeconds + ttl) * 1000).toISOString(),
      route_key: routeKey,
      actor_key: actorKey,
      total_hits: totalHits,
      rate_limit_class: policy.rate_limit_class,
      storage_mode: storageMode,
    };
  }

  private evictExpiredFallbackBuckets(): void {
    const nowMs = Date.now();

    for (const [key, bucket] of this.fallbackBuckets.entries()) {
      if (bucket.expires_at_ms <= nowMs) {
        this.fallbackBuckets.delete(key);
      }
    }
  }

  private resolvePolicy(routeKey: string, rateLimitClass: RateLimitClass): RateLimitPolicy {
    const windowSeconds = Number(
      this.configService.get<number>('security.rateLimitWindowSeconds') ?? 60,
    );
    const defaultMaxRequests = Number(
      this.configService.get<number>('security.rateLimitMaxRequests') ?? 120,
    );

    if (routeKey === 'auth-session') {
      return {
        bucket: routeKey,
        max_requests: Number(
          this.configService.get<number>('security.authSessionRateLimitMaxRequests') ?? 10,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: 'auth',
      };
    }

    if (routeKey === 'auth-recovery') {
      return {
        bucket: routeKey,
        max_requests: Number(
          this.configService.get<number>('security.authRecoveryRateLimitMaxRequests') ?? 5,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: 'auth',
      };
    }

    if (routeKey === 'auth-parent-otp') {
      return {
        bucket: routeKey,
        max_requests: Number(
          this.configService.get<number>('security.parentOtpRateLimitMaxRequests') ?? 5,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: 'auth',
      };
    }

    if (routeKey === 'auth') {
      return {
        bucket: routeKey,
        max_requests: Number(
          this.configService.get<number>('security.authRateLimitMaxRequests') ?? 20,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: 'auth',
      };
    }

    if (routeKey === 'mpesa-callback') {
      return {
        bucket: routeKey,
        max_requests: Number(
          this.configService.get<number>('security.mpesaCallbackRateLimitMaxRequests') ?? 60,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: 'payment_callback',
      };
    }

    if (rateLimitClass === 'public_read') {
      return {
        bucket: rateLimitClass,
        max_requests: Number(
          this.configService.get<number>('security.publicReadRateLimitMaxRequests') ?? 500,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: rateLimitClass,
      };
    }

    if (rateLimitClass === 'authenticated_read') {
      return {
        bucket: rateLimitClass,
        max_requests: Number(
          this.configService.get<number>('security.authenticatedReadRateLimitMaxRequests') ?? 300,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: rateLimitClass,
      };
    }

    if (rateLimitClass === 'write') {
      return {
        bucket: rateLimitClass,
        max_requests: Number(
          this.configService.get<number>('security.writeRateLimitMaxRequests') ?? 60,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: rateLimitClass,
      };
    }

    if (rateLimitClass === 'admin') {
      return {
        bucket: rateLimitClass,
        max_requests: Number(
          this.configService.get<number>('security.adminRateLimitMaxRequests') ?? 20,
        ),
        window_seconds: windowSeconds,
        rate_limit_class: rateLimitClass,
      };
    }

    return {
      bucket: routeKey,
      max_requests: defaultMaxRequests,
      window_seconds: windowSeconds,
      rate_limit_class: rateLimitClass,
    };
  }

  private resolveRateLimitClass(request: Request, routeKey: string): RateLimitClass {
    if (routeKey.startsWith('auth')) {
      return 'auth';
    }

    if (routeKey === 'mpesa-callback') {
      return 'payment_callback';
    }

    if (routeKey === 'sync') {
      return 'sync';
    }

    const path = (request.path || request.originalUrl || request.url).toLowerCase();

    if (
      path.startsWith('/admin-command')
      || path.startsWith('/internal')
      || path.startsWith('/platform')
      || path.startsWith('/superadmin')
    ) {
      return 'admin';
    }

    const method = (request.method ?? this.requestContext.getStore()?.method ?? '').toUpperCase();

    if (method === 'GET' || method === 'HEAD') {
      if (path.startsWith('/support/public') || path.startsWith('/health') || path.startsWith('/status')) {
        return 'public_read';
      }

      return 'authenticated_read';
    }

    return 'write';
  }

  private resolveRouteKey(request: Request): string {
    const path = (request.path || request.originalUrl || request.url).toLowerCase();

    if (path.startsWith('/auth/parent/otp')) {
      return 'auth-parent-otp';
    }

    if (
      path.startsWith('/auth/password-recovery')
      || path.startsWith('/auth/password/forgot')
      || path.startsWith('/auth/password/reset')
      || path.startsWith('/auth/email-verification')
      || path.startsWith('/auth/magic-link')
      || path.startsWith('/auth/invitations/accept')
    ) {
      return 'auth-recovery';
    }

    if (path.startsWith('/auth/login') || path.startsWith('/auth/refresh')) {
      return 'auth-session';
    }

    if (path.startsWith('/auth')) {
      return 'auth';
    }

    if (
      path.startsWith('/payments/mpesa/callback')
      || path.startsWith('/mpesa/callback')
      || path.startsWith('/payments/mpesa/c2b')
      || path.startsWith('/mpesa/c2b')
    ) {
      return 'mpesa-callback';
    }

    if (path.startsWith('/sync')) {
      return 'sync';
    }

    return 'api';
  }
}
