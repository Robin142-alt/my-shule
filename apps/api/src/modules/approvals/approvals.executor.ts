import { Injectable, Logger } from '@nestjs/common';

export type ExecutionHandler = (context: any) => Promise<void>;

@Injectable()
export class ApprovalsExecutor {
  private readonly logger = new Logger(ApprovalsExecutor.name);
  private handlers = new Map<string, ExecutionHandler>();

  /**
   * Register a handler for a specific module + action combination
   */
  registerHandler(module: string, action: string, handler: ExecutionHandler) {
    const key = `${module}:${action}`;
    if (this.handlers.has(key)) {
      this.logger.warn(`Handler for ${key} is being overwritten.`);
    }
    this.handlers.set(key, handler);
    this.logger.log(`Registered execution handler for approval action: ${key}`);
  }

  /**
   * Execute the mapped handler
   */
  async execute(module: string, action: string, context: any): Promise<void> {
    const key = `${module}:${action}`;
    const handler = this.handlers.get(key);

    if (!handler) {
      throw new Error(`No execution handler registered for ${key}. Please check your module setup.`);
    }

    try {
      await handler(context);
    } catch (error) {
      this.logger.error(`Execution failed for ${key}`, error);
      throw error;
    }
  }
}
