import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { EventPublisher } from '@domain/repositories/EventPublisher';
import { TrackingCode } from '@domain/entities/TrackingCode';
import { AddTrackingCodeCommand } from './AddTrackingCodeCommand';
import { 
  ValidationError, 
  TrackingAlreadyExistsError 
} from '@shared/errors';
import { TRACKING_CODE_PATTERNS } from '@shared/constants';

export interface TrackingCodeResponse {
  id: string;
  code: string;
  carrier: string;
  status: string;
  isActive: boolean;
  customerId?: string;
  contractId?: string;
  createdAt: Date;
  lastCheckedAt: Date;
  nextCheckAt: Date;
  events: any[];
  summary: {
    totalEvents: number;
    currentStatus: string;
    isDelivered: boolean;
    estimatedDelivery?: Date;
  };
}

export class AddTrackingCodeUseCase {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: any
  ) {}

  async execute(command: AddTrackingCodeCommand): Promise<TrackingCodeResponse> {
    try {
      // Validar comando
      this.validateCommand(command);

      // Verificar se já existe
      const existing = await this.trackingRepository.findByCode(command.code);
      if (existing && existing.isActive) {
        this.logger.info('Código de rastreamento já existe e está ativo', {
          code: command.code
        });
        return this.mapToResponse(existing);
      }

      // Reativar se existir mas inativo
      if (existing && !existing.isActive) {
        existing.reactivate();
        await this.trackingRepository.save(existing);
        
        await this.eventPublisher.publish('tracking.reactivated', {
          trackingCodeId: existing.id,
          code: existing.code,
          carrier: existing.carrier
        });

        this.logger.info('Código de rastreamento reativado', {
          code: command.code
        });

        return this.mapToResponse(existing);
      }

      // Criar novo código
      const trackingCode = TrackingCode.create({
        code: command.code,
        carrier: command.carrier,
        metadata: {
          contractId: command.contractId,
          customerId: command.customerId,
          origin: command.origin,
          destination: command.destination
        }
      });

      // Salvar no repositório
      await this.trackingRepository.save(trackingCode);

      // Publicar evento
      await this.eventPublisher.publish('tracking.added', {
        trackingCodeId: trackingCode.id,
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        contractId: command.contractId,
        customerId: command.customerId
      });

      this.logger.info('Código de rastreamento adicionado com sucesso', {
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        trackingCodeId: trackingCode.id
      });

      return this.mapToResponse(trackingCode);

    } catch (error) {
      this.logger.error('Erro ao adicionar código de rastreamento', {
        code: command.code,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private validateCommand(command: AddTrackingCodeCommand): void {
    if (!command.code || !command.carrier) {
      throw new ValidationError('Código e transportadora são obrigatórios');
    }

    if (!this.isValidTrackingCode(command.code, command.carrier)) {
      throw new ValidationError('Formato de código de rastreamento inválido');
    }
  }

  private isValidTrackingCode(code: string, carrier: string): boolean {
    const patterns: Record<string, RegExp> = {
      'Carriers': TRACKING_CODE_PATTERNS.CARRIERS,
      'Correios': TRACKING_CODE_PATTERNS.CORREIOS
    };

    const pattern = patterns[carrier];
    return pattern ? pattern.test(code) : false;
  }

  private mapToResponse(tracking: TrackingCode): TrackingCodeResponse {
    return {
      id: tracking.id,
      code: tracking.code,
      carrier: tracking.carrier,
      status: tracking.status.value,
      isActive: tracking.isActive,
      customerId: tracking.metadata.customerId,
      contractId: tracking.metadata.contractId,
      createdAt: tracking.createdAt,
      lastCheckedAt: tracking.lastCheckedAt,
      nextCheckAt: tracking.nextCheckAt,
      events: tracking.events.map(e => e.toJSON()),
      summary: {
        totalEvents: tracking.events.length,
        currentStatus: tracking.status.value,
        isDelivered: tracking.status.isDelivered(),
        estimatedDelivery: tracking.metadata.estimatedDelivery
      }
    };
  }
}
