import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  
  // Database
  mongoUri: string;
  mongoDbName: string;
  
  // Cache
  redisUrl: string;
  redisTtlDefault: number;
  
  // Message Broker
  kafkaBrokers: string[];
  kafkaClientId: string;
  kafkaGroupId: string;
  
  // API Externa
  carriersApiUrl: string;
  carriersApiToken: string;
  carriersApiTimeout: number;
  carriersApiRetryAttempts: number;
  
  // Scheduler
  schedulerInterval: number;
  batchSize: number;
  maxConcurrentRequests: number;
  
  // Rate Limiting
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  
  // Monitoramento
  prometheusEnabled: boolean;
  prometheusPort: number;
  healthCheckInterval: number;
  
  // Kafka Topics
  topicContractCreated: string;
  topicTrackingUpdated: string;
  topicTrackingDelivered: string;
  topicTrackingError: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tracking',
  mongoDbName: process.env.MONGODB_DB_NAME || 'tracking',
  
  // Cache
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisTtlDefault: parseInt(process.env.REDIS_TTL_DEFAULT || '300'),
  
  // Message Broker
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9093').split(','),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'tracking-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'tracking-group',
  
  // API Externa
  carriersApiUrl: process.env.CARRIERS_API_URL || 'http://api.carriers.com.br',
  carriersApiToken: process.env.CARRIERS_API_TOKEN || (() => {
    throw new Error('CARRIERS_API_TOKEN is required');
  })(),
  carriersApiTimeout: parseInt(process.env.CARRIERS_API_TIMEOUT || '15000'),
  carriersApiRetryAttempts: parseInt(process.env.CARRIERS_API_RETRY_ATTEMPTS || '3'),
  
  // Scheduler
  schedulerInterval: parseInt(process.env.SCHEDULER_INTERVAL || '60000'),
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
  
  // Rate Limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Monitoramento
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  
  // Kafka Topics
  topicContractCreated: process.env.TOPIC_CONTRACT_CREATED || 'smartenvios.contract.created',
  topicTrackingUpdated: process.env.TOPIC_TRACKING_UPDATED || 'smartenvios.tracking.status.updated',
  topicTrackingDelivered: process.env.TOPIC_TRACKING_DELIVERED || 'smartenvios.tracking.delivered',
  topicTrackingError: process.env.TOPIC_TRACKING_ERROR || 'smartenvios.tracking.error'
};
