export interface EventPublisher {
  publish(eventType: string, data: any): Promise<void>;
  publishBatch(events: Array<{ eventType: string; data: any }>): Promise<void>;
}
