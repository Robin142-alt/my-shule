import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';
import { buildRedisClientOptions } from './redis.options';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private degraded = false;
  private degradedAt = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisRequired = this.isRedisRequired();

    if (this.degraded && !this.shouldRetryDegradedConnection()) {
      this.logger.warn('Redis startup skipped because a recent degraded state is still active');
      return;
    }

    try {
      const initialize = async (): Promise<void> => {
        if (this.redisClient.status === 'wait') {
          await this.redisClient.connect();
        }

        await this.redisClient.ping();
      };

      await this.withStartupTimeout(initialize(), redisRequired);

      this.degraded = false;
      this.degradedAt = 0;
      this.logger.log('Redis connection initialized');
    } catch (error) {
      this.markDegraded();
      const message = `Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`;

      this.stopReconnects();

      if (redisRequired) {
        this.logger.error(
          `CRITICAL: ${message}. Redis is required; HTTP startup will continue in degraded mode so health checks can report the failure.`,
          error instanceof Error ? error.stack : undefined,
        );
      } else {
        this.logger.warn(`${message}; continuing with Redis degraded`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redisClient.status === 'end') {
        return;
      }

      await this.redisClient.quit();
    } catch (error) {
      this.logger.error(
        `Redis shutdown failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  getBullConnectionOptions(): RedisOptions {
    return buildRedisClientOptions(this.configService, this.logger).bullConnection;
  }

  async ping(): Promise<'up' | 'degraded'> {
    if (this.degraded && !this.shouldRetryDegradedConnection()) {
      return 'degraded';
    }

    try {
      await this.withPingTimeout(this.redisClient.ping());
      this.degraded = false;
      this.degradedAt = 0;
      return 'up';
    } catch (error) {
      this.markDegraded();
      this.stopReconnects();

      if (this.isRedisRequired()) {
        this.logger.error(
          `CRITICAL: Redis ping failed. Redis is required but allowing graceful degradation: ${error instanceof Error ? error.message : String(error)}`,
        );
      } else {
        this.logger.warn(
          `Redis ping failed; reporting degraded: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return 'degraded';
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  private isRedisRequired(): boolean {
    const configured = this.configService.get<boolean | string>('redis.required');

    if (typeof configured === 'boolean') {
      return configured;
    }

    if (typeof configured === 'string') {
      const normalized = configured.trim().toLowerCase();

      if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
      }

      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
      }
    }

    return true;
  }

  private getStartupTimeoutMs(redisRequired: boolean): number {
    const configuredTimeoutMs = Number(this.configService.get<number>('redis.connectTimeoutMs') ?? 10000);

    if (redisRequired) {
      return Math.min(Math.max(configuredTimeoutMs, 250), 1500);
    }

    return Math.min(Math.max(configuredTimeoutMs, 500), 1500);
  }

  private async withStartupTimeout<T>(operation: Promise<T>, redisRequired: boolean): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const startupTimeoutMs = this.getStartupTimeoutMs(redisRequired);

    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Redis startup timed out after ${startupTimeoutMs}ms`)),
            startupTimeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async withPingTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const configuredTimeoutMs = Number(this.configService.get<number>('redis.connectTimeoutMs') ?? 10000);
    const pingTimeoutMs = Math.min(Math.max(configuredTimeoutMs, 100), 1500);

    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Redis ping timed out after ${pingTimeoutMs}ms`)),
            pingTimeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private getDegradedRetryAfterMs(): number {
    const configuredRetryAfterMs = Number(this.configService.get<number>('redis.degradedRetryAfterMs') ?? 30000);

    return Math.min(Math.max(configuredRetryAfterMs, 1000), 300000);
  }

  private shouldRetryDegradedConnection(): boolean {
    if (!this.degraded) {
      return true;
    }

    if (this.degradedAt === 0) {
      return false;
    }

    return Date.now() - this.degradedAt >= this.getDegradedRetryAfterMs();
  }

  private markDegraded(): void {
    this.degraded = true;
    this.degradedAt = Date.now();
  }

  private stopReconnects(): void {
    try {
      if (this.redisClient.status !== 'end') {
        this.redisClient.disconnect(false);
      }
    } catch (error) {
      this.logger.warn(
        `Unable to stop optional Redis reconnects: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
