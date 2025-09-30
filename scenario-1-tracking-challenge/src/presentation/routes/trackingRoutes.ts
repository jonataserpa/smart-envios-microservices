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

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Verificar saúde do serviço
   *     description: Retorna o status de saúde do microserviço e suas dependências
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Status de saúde retornado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthCheckResponse'
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/health', (req, res) => {
    healthController.checkHealth(req, res);
  });

  /**
   * @swagger
   * /metrics:
   *   get:
   *     summary: Obter métricas do serviço
   *     description: Retorna métricas no formato Prometheus
   *     tags: [Metrics]
   *     responses:
   *       200:
   *         description: Métricas retornadas com sucesso
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               example: |
   *                 # HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
   *                 # TYPE process_cpu_user_seconds_total counter
   *                 process_cpu_user_seconds_total 1.139732
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/metrics', (req, res) => {
    metricsController.getMetrics(req, res);
  });

  /**
   * @swagger
   * /tracking:
   *   post:
   *     summary: Adicionar código de rastreamento
   *     description: Adiciona um novo código de rastreamento para monitoramento
   *     tags: [Tracking]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTrackingCodeRequest'
   *           example:
   *             code: "SM82886187440BM"
   *             carrier: "Carriers"
   *             metadata:
   *               customerId: "customer-123"
   *               orderId: "order-456"
   *               contractId: "contract-789"
   *               tags: ["priority", "express"]
   *     responses:
   *       201:
   *         description: Código de rastreamento adicionado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TrackingCodeResponse'
   *       400:
   *         description: Dados de entrada inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   *       409:
   *         description: Código de rastreamento já existe
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/tracking', 
    validateRequest(AddTrackingCodeSchema),
    (req, res) => {
      trackingController.addTracking(req, res);
    }
  );

  /**
   * @swagger
   * /tracking/{code}:
   *   get:
   *     summary: Buscar código de rastreamento específico
   *     description: Retorna informações detalhadas de um código de rastreamento
   *     tags: [Tracking]
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Código de rastreamento
   *         example: "SM82886187440BM"
   *     responses:
   *       200:
   *         description: Código de rastreamento encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TrackingCodeResponse'
   *       404:
   *         description: Código de rastreamento não encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/tracking/:code', (req, res) => {
    trackingController.getTracking(req, res);
  });

  /**
   * @swagger
   * /tracking/{code}/refresh:
   *   post:
   *     summary: Forçar atualização de rastreamento
   *     description: Força a atualização imediata de um código de rastreamento
   *     tags: [Tracking]
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Código de rastreamento
   *         example: "SM82886187440BM"
   *     responses:
   *       200:
   *         description: Atualização iniciada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Atualização iniciada com sucesso"
   *                 trackingCode:
   *                   type: string
   *                   example: "SM82886187440BM"
   *       404:
   *         description: Código de rastreamento não encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/tracking/:code/refresh', (req, res) => {
    trackingController.refreshTracking(req, res);
  });

  /**
   * @swagger
   * /tracking:
   *   get:
   *     summary: Listar códigos de rastreamento
   *     description: Lista códigos de rastreamento com filtros e paginação
   *     tags: [Tracking]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número da página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Número de itens por página
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, in_transit, out_for_delivery, delivered, exception]
   *         description: Filtrar por status
   *       - in: query
   *         name: carrier
   *         schema:
   *           type: string
   *         description: Filtrar por transportadora
   *       - in: query
   *         name: customerId
   *         schema:
   *           type: string
   *         description: Filtrar por ID do cliente
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filtrar por status ativo
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Buscar por código de rastreamento
   *     responses:
   *       200:
   *         description: Lista de códigos de rastreamento retornada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TrackingListResponse'
   *       400:
   *         description: Parâmetros de consulta inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   *       500:
   *         description: Erro interno do servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/tracking', (req, res) => {
    trackingController.listTracking(req, res);
  });

  return router;
}
