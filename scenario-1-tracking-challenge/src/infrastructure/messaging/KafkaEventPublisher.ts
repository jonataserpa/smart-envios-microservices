import { Kafka, Producer } from 'kafkajs';
import { EventPublisher } from '@domain/repositories/EventPublisher';
import { KafkaError } from '@shared/errors';
import { KAFKA_TOPICS } from '@shared/constants';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export class KafkaEventPublisher implements EventPublisher {
  private producer: Producer;

  constructor(
    private readonly config: KafkaConfig,
    private readonly logger: any
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 3000,
      requestTimeout: config.requestTimeout || 25000,
      retry: {
        initialRetryTime: config.retry?.initialRetryTime || 100,
        retries: config.retry?.retries || 8
      }
    });

    this.producer = kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: config.retry?.initialRetryTime || 100,
        retries: config.retry?.retries || 8
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.info('Kafka producer conectado');
    } catch (error) {
      throw new KafkaError('Erro ao conectar producer Kafka', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.logger.info('Kafka producer desconectado');
    } catch (error) {
      throw new KafkaError('Erro ao desconectar producer Kafka', error);
    }
  }

  async publish(eventType: string, data: any): Promise<void> {
    try {
      const topic = this.getTopicForEvent(eventType);
      
      const message = {
        eventType,
        aggregateId: data.trackingCodeId || data.id,
        data,
        timestamp: new Date().toISOString(),
        version: 1
      };

      await this.producer.send({
        topic,
        messages: [{
          key: message.aggregateId,
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }]
      });

      this.logger.debug('Evento publicado no Kafka', {
        eventType,
        topic,
        aggregateId: message.aggregateId
      });

    } catch (error) {
      this.logger.error('Erro ao publicar evento no Kafka', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new KafkaError('Erro ao publicar evento no Kafka', error);
    }
  }

  async publishBatch(events: Array<{ eventType: string; data: any }>): Promise<void> {
    try {
      const messages = events.map(event => {
        const topic = this.getTopicForEvent(event.eventType);
        const message = {
          eventType: event.eventType,
          aggregateId: event.data.trackingCodeId || event.data.id,
          data: event.data,
          timestamp: new Date().toISOString(),
          version: 1
        };

        return {
          topic,
          messages: [{
            key: message.aggregateId,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }]
        };
      });

      await this.producer.sendBatch({ topicMessages: messages });

      this.logger.debug('Lote de eventos publicado no Kafka', {
        eventsCount: events.length
      });

    } catch (error) {
      this.logger.error('Erro ao publicar lote de eventos no Kafka', {
        eventsCount: events.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new KafkaError('Erro ao publicar lote de eventos no Kafka', error);
    }
  }

  private getTopicForEvent(eventType: string): string {
    const topicMap: Record<string, string> = {
      'tracking.added': KAFKA_TOPICS.TRACKING_ADDED,
      'tracking.status.updated': KAFKA_TOPICS.TRACKING_UPDATED,
      'tracking.delivered': KAFKA_TOPICS.TRACKING_DELIVERED,
      'tracking.error': KAFKA_TOPICS.TRACKING_ERROR,
      'contract.created': KAFKA_TOPICS.CONTRACT_CREATED
    };

    return topicMap[eventType] || 'smartenvios.tracking.unknown';
  }
}
