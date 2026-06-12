export interface AgpIntent<TResult = any> {
  actionName: string;
  requiredCapability: string;
  aggregateType: string;
  aggregateId: string;
  eventName?: any; // The domain event to publish on success
  eventPayload?: any; // The payload for the event
  handler: () => Promise<TResult>; // The actual business logic execution
  fallback?: (error: Error) => Promise<TResult>; // Optional Self-Healing fallback
}
