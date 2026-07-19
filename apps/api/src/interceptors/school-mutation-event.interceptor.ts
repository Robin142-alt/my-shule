import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { mergeMap, Observable } from 'rxjs';

import { AUTH_ANONYMOUS_USER_ID } from '../auth/auth.constants';
import { RequestContextService } from '../common/request-context/request-context.service';
import { EventPublisherService } from '../modules/events/event-publisher.service';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATH_PREFIXES = [
  '/auth',
  '/events',
  '/health',
  '/metrics',
  '/platform',
  '/superadmin',
];
const EXCLUDED_CALLBACK_PATHS = [
  '/payments/mpesa/callback',
  '/payments/callback',
];

@Injectable()
export class SchoolMutationEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SchoolMutationEventInterceptor.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = String(request.method ?? '').toUpperCase();
    const path = this.normalizePath(request.originalUrl || request.url || request.path || '/');

    if (!this.shouldPublish(method, path)) {
      return next.handle();
    }

    const requestStore = this.requestContext.getStore();
    if (
      !requestStore?.is_authenticated
      || !requestStore.tenant_id
      || !requestStore.user_id
      || requestStore.user_id === AUTH_ANONYMOUS_USER_ID
    ) {
      return next.handle();
    }
    const tenantId = requestStore.tenant_id;

    return next.handle().pipe(
      mergeMap(async (result) => {
        const operationId = randomUUID();
        try {
          await this.eventPublisher.publish({
            event_key: `school.operation.recorded:${tenantId}:${operationId}`,
            event_name: 'school.operation.recorded',
            aggregate_type: 'school_mutation',
            aggregate_id: operationId,
            payload: {
              tenant_id: tenantId,
              school_id: tenantId,
              operation_id: operationId,
              operation_type: `${method} ${path}`,
              module: 'platform',
              actor_role: requestStore.role ?? 'school-user',
              title: 'School data updated',
              body: 'A school workspace saved new data.',
              entity_id: null,
              severity: 'info',
              target_roles: [],
              notifications: [],
              sms: [],
              payload: {
                method,
                path,
                system_refresh_only: true,
              },
              occurred_at: new Date().toISOString(),
            },
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to publish same-school refresh event for ${method} ${path}`,
            error instanceof Error ? error.stack : String(error),
          );
        }

        return result;
      }),
    );
  }

  private shouldPublish(method: string, path: string): boolean {
    if (!method || READ_ONLY_METHODS.has(method)) {
      return false;
    }

    if (EXCLUDED_CALLBACK_PATHS.some((excludedPath) => path === excludedPath)) {
      return false;
    }

    return !EXCLUDED_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private normalizePath(rawPath: string): string {
    const path = rawPath.split('?')[0]?.trim() || '/';
    const withoutApiPrefix = path.startsWith('/api/') ? path.slice(4) : path;
    return withoutApiPrefix.startsWith('/') ? withoutApiPrefix : `/${withoutApiPrefix}`;
  }
}
