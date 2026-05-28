import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';
import { buildRedisClientOptions } from './redis.options';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private degraded = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      if (this.redisClient.status === 'wait') {
        await this.redisClient.connect();
      }

      await this.redisClient.ping();
      this.degraded = false;
      this.logger.log('Redis connection initialized');
    } catch (error) {
      this.degraded = true;
      const message = `Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`;

      if (this.isRedisRequired()) {
        this.logger.error(message, error instanceof Error ? error.stack : undefined);
        throw error;
      }

      this.logger.warn(`${message}; continuing with Redis degraded`);
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
    try {
      await this.redisClient.ping();
      this.degraded = false;
      return 'up';
    } catch (error) {
      this.degraded = true;

      if (this.isRedisRequired()) {
        throw error;
      }

      this.logger.warn(
        `Redis ping failed; reporting degraded: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'degraded';
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  private isRedisRequired(): boolean {
    return this.configService.get<boolean>('redis.required') ?? true;
  }
}
