import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/observability/structured-logger.service';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as any).message || exception.message;
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    // Only log 500s or unexpected errors heavily, others are normal client errors
    if (status >= 500) {
      this.logger.error(
        `[GlobalExceptionFilter] Status: ${status} Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
