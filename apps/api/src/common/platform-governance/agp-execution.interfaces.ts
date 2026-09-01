export interface AgpIntent<TResult = any> {
  actionName: string;
  requiredCapability: string;
  aggregateType: string;
  aggregateId: string;
  eventName?: any; // The domain event to publish on success
  eventPayload?: any; // The payload for the event
  governanceRecordedInHandler?: boolean; // Handler transaction already persisted success event and audit
  retrySafe?: boolean; // False for commands that cannot be replayed without explicit reconciliation
  handler: () => Promise<TResult>; // The actual business logic execution
  fallback?: (error: Error) => Promise<TResult>; // Optional Self-Healing fallback
}
