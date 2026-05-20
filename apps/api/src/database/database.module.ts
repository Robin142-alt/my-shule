import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

import { DATABASE_POOL } from './database.constants';
import { DatabaseSecurityService } from './database-security.service';
import { DatabaseService } from './database.service';

export function buildDatabasePoolOptions(configService: ConfigService): PoolConfig {
  const connectionString = configService.get<string>('database.url');
  const statementTimeoutMs = Number(configService.get<number>('database.statementTimeoutMs') ?? 5000);
  const connectionTimeoutMs = Number(configService.get<number>('database.connectionTimeoutMs') ?? 10000);
  const appRuntime = configService.get<string>('app.runtime') ?? 'server';
  const apiMaxConnections = Number(
    configService.get<number>('database.apiMaxConnections')
      ?? configService.get<number>('database.maxConnections')
      ?? 20,
  );
  const workerMaxConnections = Number(configService.get<number>('database.workerMaxConnections') ?? 5);
  const maxConnections = appRuntime.includes('worker') ? workerMaxConnections : apiMaxConnections;
  const sslEnabled = Boolean(configService.get<boolean>('database.ssl'));

  return {
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: Number(configService.get<number>('database.idleTimeoutMs') ?? 10000),
    connectionTimeoutMillis: connectionTimeoutMs,
    statement_timeout: statementTimeoutMs,
    application_name: 'my-shule-api',
    keepAlive: true,
    ssl: sslEnabled || connectionString?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  };
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const logger = new Logger('DatabasePool');
        const pool = new Pool(buildDatabasePoolOptions(configService));

        pool.on('connect', () => {
          logger.log('PostgreSQL client connected');
        });

        pool.on('error', (error) => {
          logger.error(`PostgreSQL pool error: ${error.message}`, error.stack);
        });

        pool.on('remove', () => {
          logger.warn('PostgreSQL client removed from pool');
        });

        return pool;
      },
    },
    DatabaseSecurityService,
    DatabaseService,
  ],
  exports: [DatabaseService, DatabaseSecurityService, DATABASE_POOL],
})
export class DatabaseModule {}
