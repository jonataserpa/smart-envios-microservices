export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
  increment(key: string, value?: number): Promise<number>;
  decrement(key: string, value?: number): Promise<number>;
  setLastCheck(trackingCode: string, timestamp: number): Promise<void>;
  healthCheck(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
