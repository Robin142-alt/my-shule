import { Injectable, Logger } from '@nestjs/common';
import { WidgetProvider, WidgetContext, WidgetPayload } from './widget-registry.interfaces';

@Injectable()
export class WidgetRegistryService {
  private readonly logger = new Logger(WidgetRegistryService.name);
  private readonly providers = new Map<string, WidgetProvider>();

  register(provider: WidgetProvider) {
    if (this.providers.has(provider.widget_id)) {
      this.logger.warn(`Widget provider ${provider.widget_id} is being overridden.`);
    }
    this.providers.set(provider.widget_id, provider);
    this.logger.log(`Registered widget: ${provider.widget_id}`);
  }

  getProvider(widgetId: string): WidgetProvider | undefined {
    return this.providers.get(widgetId);
  }

  async resolveWidgets(context: WidgetContext): Promise<WidgetPayload[]> {
    const payloads: WidgetPayload[] = [];
    const promises = Array.from(this.providers.values())
      .filter(p => this.canAccessWidget(p, context))
      .map(async (provider) => {
        try {
          const payload = await provider.resolve(context);
          return payload;
        } catch (error: any) {
          this.logger.error(`Widget ${provider.widget_id} failed: ${error.message}`, error.stack);
          return {
            widget_id: provider.widget_id,
            state: 'FAILED',
            data: null,
            error: provider.fallback_behavior === 'SHOW_ERROR' ? error.message : 'Widget is currently unavailable.',
          } as WidgetPayload;
        }
      });

    const results = await Promise.allSettled(promises);
    for (const res of results) {
      if (res.status === 'fulfilled') {
        payloads.push(res.value);
      }
    }

    return payloads;
  }

  private canAccessWidget(provider: WidgetProvider, context: WidgetContext): boolean {
    if (provider.allowed_roles.length > 0 && !provider.allowed_roles.includes(context.role)) {
      return false;
    }
    if (provider.capabilities.length > 0) {
      const hasCaps = provider.capabilities.every(c => context.capabilities.includes(c));
      if (!hasCaps) return false;
    }
    return true;
  }
}
