import { Request, Response } from 'express';
import { HealthCheck } from '@shared/types';
import { TrackingClient } from '@domain/repositories/TrackingClient';
import { CacheService } from '@domain/repositories/CacheService';
import { TrackingRepository } from '@domain/repositories/TrackingRepository';

export class HealthController {
  constructor(
    private readonly carriersClient: TrackingClient,
    private readonly cacheService: CacheService,
    private readonly trackingRepository: TrackingRepository,
    private readonly logger: any
  ) {}

  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Verificar dependências em paralelo
      const checks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkCache(),
        this.checkCarriersAPI(),
        this.getMetrics()
      ]);

      const [dbCheck, cacheCheck, carriersCheck, metrics] = checks;

      const isHealthy = checks.every(check => check.status === 'fulfilled');
      const responseTime = Date.now() - startTime;

      const healthCheck: HealthCheck = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          database: {
            status: dbCheck.status === 'fulfilled' ? 'connected' : 'disconnected',
            responseTime: dbCheck.status === 'fulfilled' ? `${dbCheck.value.responseTime}ms` : undefined,
            error: dbCheck.status === 'rejected' ? dbCheck.reason.message : undefined
          },
          cache: {
            status: cacheCheck.status === 'fulfilled' ? 'connected' : 'disconnected',
            responseTime: cacheCheck.status === 'fulfilled' ? `${cacheCheck.value.responseTime}ms` : undefined,
            error: cacheCheck.status === 'rejected' ? cacheCheck.reason.message : undefined
          },
          carriersApi: {
            status: carriersCheck.status === 'fulfilled' ? 'connected' : 'disconnected',
            responseTime: carriersCheck.status === 'fulfilled' ? `${carriersCheck.value.responseTime}ms` : undefined,
            error: carriersCheck.status === 'rejected' ? carriersCheck.reason.message : undefined
          }
        },
        metrics: metrics.status === 'fulfilled' ? metrics.value : undefined
      };

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(healthCheck);

    } catch (error) {
      this.logger.error('Erro no health check', { error: error instanceof Error ? error.message : String(error) });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async checkDatabase(): Promise<{ responseTime: number }> {
    const startTime = Date.now();
    
    try {
      await this.trackingRepository.count();
      return { responseTime: Date.now() - startTime };
    } catch (error) {
      throw new Error(`Database check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkCache(): Promise<{ responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.cacheService.healthCheck();
      if (!isHealthy) {
        throw new Error('Cache health check failed');
      }
      return { responseTime: Date.now() - startTime };
    } catch (error) {
      throw new Error(`Cache check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkCarriersAPI(): Promise<{ responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.carriersClient.healthCheck();
      if (!isHealthy) {
        throw new Error('Carriers API health check failed');
      }
      return { responseTime: Date.now() - startTime };
    } catch (error) {
      throw new Error(`Carriers API check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getMetrics(): Promise<any> {
    try {
      const [totalCodes, activeCodes, completedCodes] = await Promise.all([
        this.trackingRepository.count(),
        this.trackingRepository.countByStatus('in_transit'),
        this.trackingRepository.countByStatus('delivered')
      ]);

      return {
        activeTrackingCodes: activeCodes,
        totalTrackingCodes: totalCodes,
        completedTrackingCodes: completedCodes,
        errorRate: '0.0%', // Seria calculado com base em métricas reais
        avgResponseTime: '89ms' // Seria calculado com base em métricas reais
      };
    } catch (error) {
      this.logger.warn('Erro ao obter métricas', { error: error instanceof Error ? error.message : String(error) });
      return {};
    }
  }
}
