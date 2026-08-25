export interface AgpIntent<TResult = any> {
  actionName: string;
  requiredCapability: string;
  aggregateType: string;
  aggregateId: string;
  eventName?: any; // The domain event to publish on success
  eventPayload?: any; // The payload for the event
  governanceRecordedInHandler?: boolean; // Handler transaction already persisted success event and audit
  handler: () => Promise<TResult>; // The actual business logic execution
  fallback?: (error: Error) => Promise<TResult>; // Optional Self-Healing fallback
}
