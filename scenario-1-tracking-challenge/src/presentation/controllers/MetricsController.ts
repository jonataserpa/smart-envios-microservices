import { Request, Response } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { TrackingRepository } from '@domain/repositories/TrackingRepository';

// Coletar métricas padrão do Node.js
collectDefaultMetrics();

// Métricas customizadas
const trackingCodesTotal = new Counter({
  name: 'tracking_codes_total',
  help: 'Total number of tracking codes',
  labelNames: ['status', 'carrier']
});

const trackingEventsProcessed = new Counter({
  name: 'tracking_events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['carrier', 'status']
});

const trackingApiRequestsDuration = new Histogram({
  name: 'tracking_api_requests_duration_seconds',
  help: 'Duration of API requests',
  labelNames: ['endpoint', 'method', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const trackingSchedulerRuns = new Counter({
  name: 'tracking_scheduler_runs_total',
  help: 'Number of scheduler executions',
  labelNames: ['status']
});

const trackingCarrierApiErrors = new Counter({
  name: 'tracking_carrier_api_errors_total',
  help: 'Errors from carrier API',
  labelNames: ['carrier', 'error_type']
});

const trackingDeliveryTime = new Histogram({
  name: 'tracking_delivery_time_seconds',
  help: 'Time from post to delivery',
  labelNames: ['carrier'],
  buckets: [86400, 172800, 259200, 345600, 432000, 518400, 604800] // 1-7 days
});

const trackingActiveCodes = new Gauge({
  name: 'tracking_codes_active',
  help: 'Number of active tracking codes',
  labelNames: ['carrier', 'status']
});

export class MetricsController {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly logger: any
  ) {}

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Atualizar métricas em tempo real
      await this.updateMetrics();

      // Coletar métricas do Prometheus
      const metrics = await register.metrics();

      res.set('Content-Type', register.contentType);
      res.status(200).send(metrics);

    } catch (error) {
      this.logger.error('Erro ao obter métricas', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Métodos para incrementar métricas
  static incrementTrackingCodes(status: string, carrier: string): void {
    trackingCodesTotal.inc({ status, carrier });
  }

  static incrementTrackingEvents(carrier: string, status: string): void {
    trackingEventsProcessed.inc({ carrier, status });
  }

  static recordApiRequestDuration(endpoint: string, method: string, statusCode: number, duration: number): void {
    trackingApiRequestsDuration.observe({ endpoint, method, status_code: statusCode }, duration);
  }

  static incrementSchedulerRuns(status: 'success' | 'error'): void {
    trackingSchedulerRuns.inc({ status });
  }

  static incrementCarrierApiErrors(carrier: string, errorType: string): void {
    trackingCarrierApiErrors.inc({ carrier, error_type: errorType });
  }

  static recordDeliveryTime(carrier: string, deliveryTimeSeconds: number): void {
    trackingDeliveryTime.observe({ carrier }, deliveryTimeSeconds);
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Atualizar contadores de códigos por status
      const statuses = ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'];
      const carriers = ['Carriers', 'Correios'];

      for (const carrier of carriers) {
        for (const status of statuses) {
          const count = await this.trackingRepository.countByStatus(status);
          trackingActiveCodes.set({ carrier, status }, count);
        }
      }

    } catch (error) {
      this.logger.warn('Erro ao atualizar métricas', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
