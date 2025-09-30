import { Router } from 'express';
import { TrackingController } from '../controllers/TrackingController';
import { HealthController } from '../controllers/HealthController';
import { MetricsController } from '../controllers/MetricsController';
import { AddTrackingCodeSchema } from '@application/commands/AddTrackingCodeCommand';
import { validateRequest } from '../middlewares/validateRequest';

export function createTrackingRoutes(
  trackingController: TrackingController,
  healthController: HealthController,
  metricsController: MetricsController
): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    healthController.checkHealth(req, res);
  });

  // Métricas Prometheus
  router.get('/metrics', (req, res) => {
    metricsController.getMetrics(req, res);
  });

  // Adicionar código de rastreamento
  router.post('/tracking', 
    validateRequest(AddTrackingCodeSchema),
    (req, res) => {
      trackingController.addTracking(req, res);
    }
  );

  // Buscar código específico
  router.get('/tracking/:code', (req, res) => {
    trackingController.getTracking(req, res);
  });

  // Forçar atualização (refresh)
  router.post('/tracking/:code/refresh', (req, res) => {
    trackingController.refreshTracking(req, res);
  });

  // Listar códigos com filtros
  router.get('/tracking', (req, res) => {
    trackingController.listTracking(req, res);
  });

  return router;
}
