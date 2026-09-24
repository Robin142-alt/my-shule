import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';

export interface ReportCardFailure {
  student_id: string;
  student_name?: string;
  code: string;
  message: string;
  retryable: boolean;
  attempts: number;
}

export function classifyReportCardFailure(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, any> : {};
  // Prisma wraps PostgreSQL SQLSTATE in meta; never send SQL or driver messages to the browser.
  const code = String(record.meta?.code ?? record.meta?.driverAdapterError?.cause?.originalCode ?? record.code ?? '');
  if (error instanceof HttpException && error.getStatus() >= 500) {
    return { code: 'GENERATION_TEMPORARILY_UNAVAILABLE', message: 'Storage or report processing is temporarily unavailable. Retry; completed cards will be reused.', retryable: true };
  }
  if (error instanceof BadRequestException) {
    return { code: 'INVALID_REPORT_DATA', message: error.message.slice(0, 240), retryable: false };
  }
  if (error instanceof ConflictException) {
    return { code: 'REPORT_WORKFLOW_CONFLICT', message: error.message.slice(0, 240), retryable: false };
  }
  if (error instanceof NotFoundException) {
    return { code: 'REPORT_DATA_NOT_FOUND', message: 'The learner or exam is no longer available in this school. Refresh the class and try again.', retryable: false };
  }
  if (['40001', '40P01', '55P03', '57014', '53300', '57P01', '57P02', '57P03', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code) || /^08\d{3}$/.test(code)) {
    return { code: 'GENERATION_TEMPORARILY_UNAVAILABLE', message: 'The report service is temporarily busy or unavailable. Retry generation; completed cards will be reused.', retryable: true };
  }
  if (['42703', '42P01', '42883', '42804'].includes(code)) {
    return { code: 'REPORT_SCHEMA_MISMATCH', message: 'The report service needs a database compatibility repair. Contact the system administrator with the batch reference; changing marks will not fix this error.', retryable: false };
  }
  return { code: 'REPORT_GENERATION_ERROR', message: 'The report could not be generated. Contact the system administrator with the batch reference, then retry after the issue is resolved.', retryable: false };
}

/** Bounds database/rendering pressure across all simultaneous batches in this process. */
export class ReportCardWorkLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly concurrency = 4) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active += 1;
    }
    try {
      return await work();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active -= 1;
    }
  }
}
