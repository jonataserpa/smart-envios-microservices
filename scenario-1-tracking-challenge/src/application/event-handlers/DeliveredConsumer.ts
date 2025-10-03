import { Kafka, Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@shared/constants';

export interface KafkaConsumerConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
}

export class DeliveredConsumer {
  private consumer: Consumer;

  constructor(
    private readonly config: KafkaConsumerConfig,
    private readonly logger: any
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers
    });

    this.consumer = kafka.consumer({
      groupId: config.groupId
    });
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topic: KAFKA_TOPICS.TRACKING_DELIVERED,
        fromBeginning: false 
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = message.value?.toString();
            if (messageValue) {
              const data = JSON.parse(messageValue);
              console.log('🎉 Entrega realizada com sucesso!', {
                trackingCode: data.trackingCode,
                timestamp: new Date().toISOString(),
                data: data
              });
            }
          } catch (error) {
            this.logger.error('Erro ao processar mensagem de delivered', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });

      this.logger.info('DeliveredConsumer iniciado');

    } catch (error) {
      this.logger.error('Erro ao iniciar DeliveredConsumer', {
        error: error instanceof Error ? error.message : String(error)
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
