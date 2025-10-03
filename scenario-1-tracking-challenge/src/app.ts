import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';

import { config } from '@shared/config';
import logger from '@shared/utils/logger';

// Controllers
import { TrackingController } from '@presentation/controllers/TrackingController';
import { HealthController } from '@presentation/controllers/HealthController';
import { MetricsController } from '@presentation/controllers/MetricsController';

// Use Cases
import { AddTrackingCodeUseCase } from '@application/commands/AddTrackingCodeUseCase';
import { UpdateTrackingUseCase } from '@application/commands/UpdateTrackingUseCase';
import { GetTrackingQuery } from '@application/queries/GetTrackingQuery';
import { ListTrackingQuery } from '@application/queries/ListTrackingQuery';

// Infrastructure
import { MongoTrackingRepository } from '@infrastructure/database/MongoTrackingRepository';
import { RedisCacheService } from '@infrastructure/cache/RedisCacheService';
import { CarriersTrackingClient } from '@infrastructure/carriers/CarriersTrackingClient';
import { KafkaEventPublisher } from '@infrastructure/messaging/KafkaEventPublisher';

// Schedulers
import { TrackingScheduler } from '@application/schedulers/TrackingScheduler';
import { ContractCreatedEventHandler } from '@application/event-handlers/ContractCreatedEventHandler';
import { DeliveredConsumer } from '@application/event-handlers/DeliveredConsumer';

// Middlewares
import { errorHandler } from '@presentation/middlewares/errorHandler';
import { requestLogger } from '@presentation/middlewares/requestLogger';
import { setupSwagger } from '@presentation/middlewares/swagger';

// Routes
import { createTrackingRoutes } from '@presentation/routes/trackingRoutes';

class TrackingMicroservice {
  private app: express.Application;
  private server: any;
  private scheduler!: TrackingScheduler;
  private eventHandler!: ContractCreatedEventHandler;
  private deliveredConsumer!: DeliveredConsumer;
  private cacheService!: RedisCacheService;
  private eventPublisher!: KafkaEventPublisher;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors());
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use(requestLogger);
    
    // Swagger documentation
    setupSwagger(this.app);
    
    // Logger para uso nos controllers
    this.app.set('logger', logger);
  }

  private setupRoutes(): void {
    // Inicializar dependências
    const trackingRepository = new MongoTrackingRepository();
    this.cacheService = new RedisCacheService(config.redisUrl);
    const carriersClient = new CarriersTrackingClient(
      {
        baseUrl: config.carriersApiUrl,
        token: config.carriersApiToken,
        timeout: config.carriersApiTimeout,
        retryAttempts: config.carriersApiRetryAttempts
      },
      logger
    );
    this.eventPublisher = new KafkaEventPublisher(
      {
        brokers: config.kafkaBrokers,
        clientId: config.kafkaClientId
      },
      logger
    );

    // Use Cases
    const addTrackingUseCase = new AddTrackingCodeUseCase(
      trackingRepository,
      this.eventPublisher,
      logger
    );

    const updateTrackingUseCase = new UpdateTrackingUseCase(
      trackingRepository,
      carriersClient,
      this.eventPublisher,
      this.cacheService,
      logger
    );

    const getTrackingQuery = new GetTrackingQuery(
      trackingRepository,
      this.cacheService,
      logger
    );

    const listTrackingQuery = new ListTrackingQuery(
      trackingRepository,
      logger
    );

    // Controllers
    const trackingController = new TrackingController(
      addTrackingUseCase,
      updateTrackingUseCase,
      getTrackingQuery,
      listTrackingQuery,
      logger
    );

    const healthController = new HealthController(
      carriersClient,
      this.cacheService,
      trackingRepository,
      logger
    );

    const metricsController = new MetricsController(
      trackingRepository,
      logger
    );

    // Scheduler
    this.scheduler = new TrackingScheduler(
      updateTrackingUseCase,
      trackingRepository,
      {
        interval: config.schedulerInterval,
        batchSize: config.batchSize,
        maxConcurrentRequests: config.maxConcurrentRequests
      },
      logger
    );

    // Event Handlers
    this.eventHandler = new ContractCreatedEventHandler(
      {
        brokers: config.kafkaBrokers,
        clientId: config.kafkaClientId,
        groupId: config.kafkaGroupId
      },
      addTrackingUseCase,
      logger
    );

    this.deliveredConsumer = new DeliveredConsumer(
      {
        brokers: config.kafkaBrokers,
        clientId: config.kafkaClientId,
        groupId: config.kafkaGroupId + '-delivered'
      },
      logger
    );

    // Routes
    const trackingRoutes = createTrackingRoutes(
      trackingController,
      healthController,
      metricsController
    );

    this.app.use('/api/v1', trackingRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Tracking Microservice',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Conectar ao MongoDB
      await mongoose.connect(config.mongoUri);
      logger.info('Conectado ao MongoDB');

      // Conectar ao Redis
      await this.cacheService.connect();
      logger.info('Conectado ao Redis');

      // Conectar ao Kafka
      await this.eventPublisher.connect();
      await this.eventHandler.start();
      await this.deliveredConsumer.start();
      logger.info('Conectado ao Kafka');

      // Iniciar scheduler
      this.scheduler.start();
      logger.info('Scheduler iniciado');

      // Iniciar servidor HTTP
      this.server = this.app.listen(config.port, () => {
        logger.info(`Servidor rodando na porta ${config.port}`);
        logger.info(`Ambiente: ${config.nodeEnv}`);
        logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
        logger.info(`Métricas: http://localhost:${config.port}/api/v1/metrics`);
      });

    } catch (error) {
      logger.error('Erro ao iniciar aplicação', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Parando aplicação...');

      // Parar servidor HTTP
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }

      // Parar scheduler
      this.scheduler.stop();

      // Parar event handlers
      await this.eventHandler.stop();
      await this.deliveredConsumer.stop();

      // Desconectar do MongoDB
      await mongoose.disconnect();
      logger.info('Desconectado do MongoDB');

      // Desconectar do Redis
      await this.cacheService.disconnect();
      logger.info('Desconectado do Redis');

      logger.info('Aplicação parada com sucesso');

    } catch (error) {
      logger.error('Erro ao parar aplicação', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

// Inicializar aplicação
const app = new TrackingMicroservice();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido, iniciando shutdown graceful...');
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recebido, iniciando shutdown graceful...');
  await app.stop();
  process.exit(0);
});

// Iniciar aplicação
app.start().catch((error) => {
  logger.error('Erro fatal ao iniciar aplicação', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

export default app;
