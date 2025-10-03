import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { TrackingClient } from '@domain/repositories/TrackingClient';
import { EventPublisher } from '@domain/repositories/EventPublisher';
import { CacheService } from '@domain/repositories/CacheService';
import { TrackingCode } from '@domain/entities/TrackingCode';
import { TrackingEvent } from '@domain/entities/TrackingEvent';
import { TrackingStatus } from '@domain/value-objects/TrackingStatus';
import { 
  TrackingNotFoundError, 
  RateLimitError 
} from '@shared/errors';
import { CARRIERS_STATUS_MAP, EXCEPTION_STATUSES, DELIVERED_STATUSES } from '@shared/constants';
import { MetricsController } from '@presentation/controllers/MetricsController';

export class UpdateTrackingUseCase {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly carriersClient: TrackingClient,
    private readonly eventPublisher: EventPublisher,
    private readonly cacheService: CacheService,
    private readonly logger: any
  ) {}

  async execute(trackingCode: string): Promise<TrackingEvent[]> {
    let tracking = await this.trackingRepository.findByCode(trackingCode);
    
    // Se não existe no banco, criar um novo registro
    if (!tracking) {
      this.logger.info(`🆕 Código ${trackingCode} não encontrado no banco, criando novo registro`);
      
      // Criar um novo TrackingCode básico
      const TrackingCode = require('@domain/entities/TrackingCode').TrackingCode;
      const newTracking = TrackingCode.create({
        code: trackingCode,
        carrier: 'Carriers', // Assumir Carriers por padrão
        metadata: {}
      });
      
      // Salvar no banco
      tracking = await this.trackingRepository.save(newTracking);
      this.logger.info(`✅ Novo código ${trackingCode} criado no banco`);
    }

    try {
      this.logger.info(`🔍 Consultando API Carriers para código: ${trackingCode}`);

      // Buscar dados da API Carriers
      const carriersResponse = await this.carriersClient.trackShipment(trackingCode);
      
      // Mapear eventos da resposta
      const newEvents = this.mapCarriersEvents(carriersResponse, trackingCode);

      this.logger.info(`📋 API Carriers retornou ${newEvents.length} eventos para ${trackingCode}`, {
        currentStatus: tracking.status.value,
        eventsFound: newEvents.length
      });

      // Processar novos eventos
      const previousStatus = tracking.status;
      tracking.addEvents(newEvents);
      tracking.updateLastCheck();

      // Salvar mudanças
      await this.trackingRepository.save(tracking);

      // Publicar eventos se houve mudanças
      if (newEvents.length > 0) {
        await this.publishTrackingEvents(tracking, newEvents, previousStatus);
        this.logger.info(`📢 Eventos publicados para ${trackingCode}`, {
          eventsCount: newEvents.length,
          statusChanged: previousStatus.value !== tracking.status.value,
          newStatus: tracking.status.value,
          previousStatus: previousStatus.value
        });
      } else {
        this.logger.info(`ℹ️ Nenhum evento novo para ${trackingCode} - status mantido: ${tracking.status.value}`);
      }

      // Cache da última verificação
      await this.cacheService.setLastCheck(trackingCode, Date.now());

      // Incrementar métricas de eventos processados
      MetricsController.incrementTrackingEvents(tracking.carrier, tracking.status.value);

      this.logger.info(`✅ ${trackingCode} atualizado com sucesso`, {
        newEvents: newEvents.length,
        currentStatus: tracking.status.value,
        totalEvents: tracking.events.length
      });

      return tracking.events;

    } catch (error) {
      // Atualizar timestamp mesmo com erro
      tracking.updateLastCheck();
      
      if (error instanceof Error && error.name?.includes('CarriersApiError')) {
        tracking.incrementErrorCount();
      }
      
      await this.trackingRepository.save(tracking);

      this.logger.error('❌ Erro ao atualizar rastreamento', {
        trackingCode,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      throw error;
    }
  }


  private mapCarriersEvents(response: any, trackingCode: string): TrackingEvent[] {
    if (!response.events || !Array.isArray(response.events)) {
      return [];
    }

    return response.events.map((carriersEvent: any) => 
      TrackingEvent.create({
        trackingCodeId: '', // Será preenchido pelo aggregate
        timestamp: new Date(carriersEvent.date_time || carriersEvent.date),
        status: this.mapCarriersStatus(carriersEvent.status),
        location: carriersEvent.location || '',
        description: carriersEvent.description || carriersEvent.status,
        isDelivered: this.isDeliveredStatus(carriersEvent.status),
        isException: this.isExceptionStatus(carriersEvent.status),
        carrierRawData: carriersEvent
      })
    );
  }

  private mapCarriersStatus(carriersStatus: string): string {
    return (CARRIERS_STATUS_MAP as Record<string, string>)[carriersStatus] || 'unknown';
  }

  private isDeliveredStatus(status: string): boolean {
    return (DELIVERED_STATUSES as readonly string[]).includes(status);
  }

  private isExceptionStatus(status: string): boolean {
    return EXCEPTION_STATUSES.some(ex => status.includes(ex));
  }

  private async publishTrackingEvents(
    tracking: TrackingCode,
    newEvents: TrackingEvent[],
    previousStatus: TrackingStatus
  ): Promise<void> {
    // Publicar mudança de status se houve alteração
    if (previousStatus.value !== tracking.status.value) {
      await this.eventPublisher.publish('tracking.status.updated', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        previousStatus: previousStatus.value,
        currentStatus: tracking.status.value,
        isDelivered: tracking.status.isDelivered(),
        timestamp: new Date().toISOString()
      });
    }

    // Publicar cada novo evento
    for (const event of newEvents) {
      await this.eventPublisher.publish('tracking.event.new', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        event: {
          timestamp: event.timestamp,
          status: event.status,
          location: event.location,
          description: event.description,
          isDelivered: event.isDelivered,
          isException: event.isException
        }
      });
    }

    // Publicar evento especial se entregue
    if (tracking.status.isDelivered()) {
      await this.eventPublisher.publish('tracking.delivered', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        deliveredAt: new Date().toISOString(),
        totalEvents: tracking.events.length
      });
    }
  }
}
