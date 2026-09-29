import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { AUTH_ANONYMOUS_USER_ID, AUTH_GUEST_ROLE } from '../auth/auth.constants';
import { RequestContextService } from '../common/request-context/request-context.service';
import { generateSpanId, generateTraceId } from '../common/request-context/trace.utils';
import { sanitizeRequestPath } from '../common/request-path.util';
import { resolveRequestClientIp } from '../common/gateway-identity';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestIdHeader = request.headers['x-request-id'];
    const traceIdHeader = request.headers['x-trace-id'];
    const parentSpanIdHeader = request.headers['x-parent-span-id'];
    const startedAt = new Date().toISOString();
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0] || randomUUID()
      : requestIdHeader || randomUUID();
    const traceId = Array.isArray(traceIdHeader)
      ? traceIdHeader[0] || generateTraceId()
      : traceIdHeader || requestId || generateTraceId();
    const parentSpanId = Array.isArray(parentSpanIdHeader)
      ? parentSpanIdHeader[0] || null
      : parentSpanIdHeader || null;
    const safePath = sanitizeRequestPath(request.originalUrl || request.url);

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-trace-id', traceId);

    this.requestContext.run(
      {
        request_id: requestId,
        trace_id: traceId,
        span_id: generateSpanId(),
        parent_span_id: parentSpanId,
        tenant_id: null,
        audience: null,
        user_id: AUTH_ANONYMOUS_USER_ID,
        role: AUTH_GUEST_ROLE,
        session_id: null,
        permissions: [],
        is_authenticated: false,
        client_ip: resolveRequestClientIp(request),
        user_agent: this.resolveUserAgent(request),
        method: request.method,
        path: safePath,
        started_at: startedAt,
      },
      next,
    );
  }

  private resolveUserAgent(request: Request): string | null {
    const userAgent = request.headers['user-agent'];

    if (Array.isArray(userAgent)) {
      return userAgent[0] ?? null;
    }

    return userAgent ?? null;
  }
}
