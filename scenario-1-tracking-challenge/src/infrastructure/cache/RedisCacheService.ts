import { createClient, RedisClientType } from 'redis';
import { CacheService } from '@domain/repositories/CacheService';
import { CacheError } from '@shared/errors';

export class RedisCacheService implements CacheService {
  private client: RedisClientType;

  constructor(private readonly redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.setupEventHandlers();
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      throw new CacheError('Erro ao conectar com Redis', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      throw new CacheError('Erro ao desconectar do Redis', error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      throw new CacheError(`Erro ao buscar chave ${key}`, error);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      throw new CacheError(`Erro ao definir chave ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      throw new CacheError(`Erro ao deletar chave ${key}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      throw new CacheError(`Erro ao verificar existência da chave ${key}`, error);
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      throw new CacheError(`Erro ao definir TTL para chave ${key}`, error);
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await this.client.incrBy(key, value);
    } catch (error) {
      throw new CacheError(`Erro ao incrementar chave ${key}`, error);
    }
  }

  async decrement(key: string, value: number = 1): Promise<number> {
    try {
      return await this.client.decrBy(key, value);
    } catch (error) {
      throw new CacheError(`Erro ao decrementar chave ${key}`, error);
    }
  }

  async setLastCheck(trackingCode: string, timestamp: number): Promise<void> {
    try {
      const key = `last_check:${trackingCode}`;
      await this.client.setEx(key, 86400, timestamp.toString()); // 24h TTL
    } catch (error) {
      throw new CacheError(`Erro ao definir último check para ${trackingCode}`, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
    });
  }
}
