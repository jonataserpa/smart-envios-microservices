import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { CacheService } from '@domain/repositories/CacheService';
import { TrackingNotFoundError } from '@shared/errors';
import { CACHE_TTL } from '@shared/constants';

export interface TrackingResponse {
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
    daysSincePosted?: number;
    timeline?: {
      posted?: Date;
      inTransit?: Date;
      outForDelivery?: Date;
      delivered?: Date;
    };
  };
  metadata: any;
}

export class GetTrackingQuery {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly cacheService: CacheService,
    private readonly logger: any
  ) {}

  async execute(trackingCode: string): Promise<TrackingResponse> {
    try {
      // Verificar cache primeiro
      const cacheKey = `tracking:${trackingCode}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        this.logger.debug('Dados de rastreamento obtidos do cache', { trackingCode });
        return JSON.parse(cached);
      }

      // Buscar no banco de dados
      const tracking = await this.trackingRepository.findByCode(trackingCode);
      if (!tracking) {
        throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado`);
      }

      const response = this.mapToResponse(tracking);

      // Cachear resultado
      await this.cacheService.set(
        cacheKey, 
        JSON.stringify(response), 
        CACHE_TTL.TRACKING_DATA
      );

      this.logger.debug('Dados de rastreamento obtidos do banco', { trackingCode });

      return response;

    } catch (error) {
      this.logger.error('Erro ao buscar rastreamento', {
        trackingCode,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private mapToResponse(tracking: any): TrackingResponse {
    const events = tracking.events || [];
    const postedEvent = events.find((e: any) => e.status === 'posted');
    const inTransitEvent = events.find((e: any) => e.status === 'in_transit');
    const outForDeliveryEvent = events.find((e: any) => e.status === 'out_for_delivery');
    const deliveredEvent = events.find((e: any) => e.isDelivered);

    return {
      id: tracking.id,
      code: tracking.code,
      carrier: tracking.carrier,
      status: tracking.status,
      isActive: tracking.isActive,
      customerId: tracking.metadata?.customerId,
      contractId: tracking.metadata?.contractId,
      createdAt: tracking.createdAt,
      lastCheckedAt: tracking.lastCheckedAt,
      nextCheckAt: tracking.nextCheckAt,
      events: events.map((e: any) => ({
        id: e.id,
        timestamp: e.timestamp,
        status: e.status,
        location: e.location,
        description: e.description,
        isDelivered: e.isDelivered,
        isException: e.isException
      })),
      summary: {
        totalEvents: events.length,
        currentStatus: tracking.status,
        isDelivered: tracking.status === 'delivered',
        estimatedDelivery: tracking.metadata?.estimatedDelivery,
        daysSincePosted: postedEvent ? this.daysSince(postedEvent.timestamp) : undefined,
        timeline: {
          posted: postedEvent?.timestamp,
          inTransit: inTransitEvent?.timestamp,
          outForDelivery: outForDeliveryEvent?.timestamp,
          delivered: deliveredEvent?.timestamp
        }
      },
      metadata: tracking.metadata
    };
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }
}
