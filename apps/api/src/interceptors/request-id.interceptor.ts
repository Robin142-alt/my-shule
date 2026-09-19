import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';

import { RequestContextService } from '../common/request-context/request-context.service';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = this.requestContext.getStore()?.request_id;

    // Nest subscribes to SSE interceptors after flushing stream headers. The
    // request-context middleware already sets this header before that flush.
    if (requestId && !response.headersSent) {
      response.setHeader('x-request-id', requestId);
    }

    return next.handle();
  }
}

