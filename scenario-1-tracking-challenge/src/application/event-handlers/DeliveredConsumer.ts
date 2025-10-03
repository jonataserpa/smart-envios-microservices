import { Kafka, Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@shared/constants';

export interface KafkaConsumerConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  connectionTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export class DeliveredConsumer {
  private consumer: Consumer;

  constructor(
    private readonly config: KafkaConsumerConfig,
    private readonly logger: any
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 3000,
      requestTimeout: 25000,
      retry: {
        initialRetryTime: config.retry?.initialRetryTime || 100,
        retries: config.retry?.retries || 8
      }
    });

    this.consumer = kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      retry: {
        initialRetryTime: config.retry?.initialRetryTime || 100,
        retries: config.retry?.retries || 8
      }
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info('🔌 Conectando DeliveredConsumer ao Kafka...', {
        brokers: this.config.brokers,
        groupId: this.config.groupId,
        topic: KAFKA_TOPICS.TRACKING_DELIVERED
      });

      await this.consumer.connect();
      this.logger.info('✅ DeliveredConsumer conectado ao Kafka');

      await this.consumer.subscribe({ 
        topic: KAFKA_TOPICS.TRACKING_DELIVERED,
        fromBeginning: true 
      });
      this.logger.info('📡 DeliveredConsumer inscrito no tópico', {
        topic: KAFKA_TOPICS.TRACKING_DELIVERED
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            this.logger.info('📨 Mensagem recebida no tópico delivered', {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              valueLength: message.value?.length
            });

            const messageValue = message.value?.toString();
            if (messageValue) {
              const data = JSON.parse(messageValue);
              console.log('🎉 Entrega realizada com sucesso!', {
                trackingCode: data.trackingCode,
                timestamp: new Date().toISOString(),
                data: data
              });
              
              this.logger.info('✅ Mensagem de delivered processada com sucesso', {
                trackingCode: data.trackingCode
              });
            } else {
              this.logger.warn('⚠️ Mensagem vazia recebida no tópico delivered');
            }
          } catch (error) {
            this.logger.error('❌ Erro ao processar mensagem de delivered', {
              error: error instanceof Error ? error.message : String(error),
              topic,
              partition,
              offset: message.offset
            });
          }
        }
      });

      this.logger.info('🚀 DeliveredConsumer iniciado e escutando mensagens');

    } catch (error) {
      this.logger.error('❌ Erro ao iniciar DeliveredConsumer', {
        error: error instanceof Error ? error.message : String(error),
        brokers: this.config.brokers,
        groupId: this.config.groupId
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.consumer.disconnect();
      this.logger.info('DeliveredConsumer parado');
    } catch (error) {
      this.logger.error('Erro ao parar DeliveredConsumer', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
