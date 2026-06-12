export type WidgetState = 'ACTIVE' | 'EMPTY' | 'DEGRADED' | 'LOCKED' | 'FAILED' | 'LOADING';

export interface WidgetContext {
  tenantId: string;
  userId?: string;
  role: string;
  capabilities: string[];
}

export interface WidgetPayload {
  widget_id: string;
  state: WidgetState;
  data: any;
  error?: string;
}

export interface WidgetProvider {
  widget_id: string;
  capabilities: string[];
  allowed_roles: string[];
  event_subscriptions: string[];
  fallback_behavior: 'HIDE' | 'DEGRADE' | 'SHOW_ERROR';
  failure_policy: 'CONTINUE' | 'ABORT';
  
  resolve(context: WidgetContext): Promise<WidgetPayload>;
}
