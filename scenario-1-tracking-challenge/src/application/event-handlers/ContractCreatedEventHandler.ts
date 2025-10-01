import { Kafka, Consumer } from 'kafkajs';
import { AddTrackingCodeUseCase } from '../commands/AddTrackingCodeUseCase';
import { KafkaError } from '@shared/errors';
import { KAFKA_TOPICS } from '@shared/constants';

export interface KafkaConsumerConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export class ContractCreatedEventHandler {
  private consumer: Consumer;

  constructor(
    private readonly config: KafkaConsumerConfig,
    private readonly addTrackingUseCase: AddTrackingCodeUseCase,
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
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topic: KAFKA_TOPICS.CONTRACT_CREATED,
        fromBeginning: false 
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            await this.handleMessage(topic, partition, message);
          } catch (error) {
            this.logger.error('Erro ao processar mensagem do Kafka', {
              topic,
              partition,
              offset: message.offset,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });

      this.logger.info('ContractCreatedEventHandler iniciado');

    } catch (error) {
      throw new KafkaError('Erro ao iniciar consumer Kafka', error);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.consumer.disconnect();
      this.logger.info('ContractCreatedEventHandler parado');
    } catch (error) {
      throw new KafkaError('Erro ao parar consumer Kafka', error);
    }
  }

  private async handleMessage(topic: string, partition: number, message: any): Promise<void> {
    try {
      const data = JSON.parse(message.value.toString());
      
      this.logger.debug('Mensagem recebida do Kafka', {
        topic,
        partition,
        offset: message.offset,
        eventType: data.eventType
      });

      // Verificar se é um evento de contrato criado
      if (data.eventType === 'contract.created' && data.data?.trackingCode) {
        await this.handleContractCreated(data.data);
      }

    } catch (error) {
      this.logger.error('Erro ao processar mensagem do Kafka', {
        topic,
        partition,
        offset: message.offset,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async handleContractCreated(data: any): Promise<void> {
    try {
      const { trackingCode, carrier, contractId, customerId, origin, destination } = data;

      if (!trackingCode || !carrier) {
        this.logger.warn('Dados de contrato inválidos - trackingCode ou carrier ausentes', {
          contractId,
          data
        });
        return;
      }

      await this.addTrackingUseCase.execute({
        code: trackingCode,
        carrier,
        contractId,
        customerId,
        origin,
        destination
      });

      this.logger.info('Código de rastreamento adicionado via evento Kafka', {
        trackingCode,
        carrier,
        contractId,
        customerId
      });

    } catch (error) {
      this.logger.error('Erro ao processar evento de contrato criado', {
        contractId: data.contractId,
        trackingCode: data.trackingCode,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Não re-throw para não quebrar o consumer
    }
  }
}
