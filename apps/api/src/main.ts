import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { StructuredLoggerService } from './modules/observability/structured-logger.service';
import { createApp } from './app.factory';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const logger = app.get(StructuredLoggerService);
  const port = Number(process.env.PORT ?? configService.get<number>('app.port') ?? 3000);

  app.enableShutdownHooks();
  instrumentModuleInitHooks(app, logger);

  logger.log(`Starting API listener on port ${port}`);
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on port ${port}`);
}

function instrumentModuleInitHooks(app: INestApplication, logger: StructuredLoggerService): void {
  if (process.env.BOOTSTRAP_TRACE_INIT !== 'true') {
    return;
  }

  const container = (app as unknown as { container?: { getModules?: () => Map<unknown, unknown> } }).container;
  const modules = container?.getModules?.();

  if (!modules) {
    logger.warn('Bootstrap init tracing requested but Nest module container was not available');
    return;
  }

  for (const moduleRef of modules.values()) {
    const collections = [
      (moduleRef as { providers?: Map<unknown, { instance?: unknown; name?: string }> }).providers,
      (moduleRef as { controllers?: Map<unknown, { instance?: unknown; name?: string }> }).controllers,
      (moduleRef as { injectables?: Map<unknown, { instance?: unknown; name?: string }> }).injectables,
    ];

    for (const collection of collections) {
      if (!collection) {
        continue;
      }

      for (const wrapper of collection.values()) {
        const instance = wrapper.instance as { onModuleInit?: () => unknown; constructor?: { name?: string } } | undefined;
        if (!instance || typeof instance.onModuleInit !== 'function') {
          continue;
        }

        const original = instance.onModuleInit.bind(instance);
        const providerName = instance.constructor?.name ?? wrapper.name ?? 'UnknownProvider';

        instance.onModuleInit = async () => {
          const startedAt = Date.now();
          logger.log(`Bootstrap init starting: ${providerName}`);
          try {
            const result = await original();
            logger.log(`Bootstrap init finished: ${providerName} (${Date.now() - startedAt}ms)`);
            return result;
          } catch (error) {
            logger.error(
              `Bootstrap init failed: ${providerName} (${Date.now() - startedAt}ms)`,
              error instanceof Error ? error.stack : String(error),
            );
            throw error;
          }
        };
      }
    }
  }
}

void bootstrap();
