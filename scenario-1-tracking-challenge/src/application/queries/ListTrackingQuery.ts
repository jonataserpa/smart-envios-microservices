import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { TrackingListQuery } from '@shared/types';

export interface TrackingListResponse {
  items: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: {
    totalActive: number;
    totalCompleted: number;
    averageDeliveryTime?: string;
    successRate?: string;
  };
}

export class ListTrackingQuery {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly logger: any
  ) {}

  async execute(query: TrackingListQuery): Promise<TrackingListResponse> {
    try {
      const result = await this.trackingRepository.list(query);
      
      // Calcular estatísticas
      const summary = await this.calculateSummary();

      const response: TrackingListResponse = {
        items: result.items.map(tracking => this.mapToListItem(tracking)),
        pagination: {
          currentPage: query.page || 1,
          totalPages: Math.ceil(result.total / (query.limit || 10)),
          totalItems: result.total,
          itemsPerPage: query.limit || 10,
          hasNextPage: (query.page || 1) < Math.ceil(result.total / (query.limit || 10)),
          hasPreviousPage: (query.page || 1) > 1
        },
        summary
      };

      this.logger.debug('Lista de rastreamentos obtida', {
        totalItems: result.total,
        currentPage: query.page || 1
      });

      return response;

    } catch (error) {
      this.logger.error('Erro ao listar rastreamentos', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async calculateSummary(): Promise<any> {
    try {
      const [totalActive, totalCompleted] = await Promise.all([
        this.trackingRepository.countByStatus('in_transit'),
        this.trackingRepository.countByStatus('delivered')
      ]);

      const total = totalActive + totalCompleted;
      const successRate = total > 0 ? ((totalCompleted / total) * 100).toFixed(1) + '%' : '0%';

      return {
        totalActive,
        totalCompleted,
        successRate
      };
    } catch (error) {
      this.logger.warn('Erro ao calcular estatísticas', { error: error instanceof Error ? error.message : String(error) });
      return {
        totalActive: 0,
        totalCompleted: 0,
        successRate: '0%'
      };
    }
  }

  private mapToListItem(tracking: any): any {
    const events = tracking.events || [];
    const lastEvent = events[events.length - 1];

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
      eventsCount: events.length,
      currentStatus: tracking.status,
      isDelivered: tracking.status === 'delivered',
      lastEventAt: lastEvent?.timestamp,
      daysSincePosted: this.calculateDaysSincePosted(events)
    };
  }

  private calculateDaysSincePosted(events: any[]): number | undefined {
    const postedEvent = events.find(e => e.status === 'posted');
    if (!postedEvent) return undefined;
    
    return Math.floor((Date.now() - new Date(postedEvent.timestamp).getTime()) / (1000 * 60 * 60 * 24));
  }
}
