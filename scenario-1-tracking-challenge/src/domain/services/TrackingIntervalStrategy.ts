import { TrackingStatus } from '../value-objects/TrackingStatus';
import { TRACKING_INTERVALS } from '@shared/constants';

export class TrackingIntervalStrategy {
  static calculate(
    status: TrackingStatus,
    eventsCount: number,
    hoursSinceLastEvent: number,
    errorCount: number
  ): number {
    // Intervalos base em segundos
    const baseIntervals: Record<string, number> = {
      [TrackingStatus.PENDING.value]: TRACKING_INTERVALS.PENDING,
      [TrackingStatus.IN_TRANSIT.value]: TRACKING_INTERVALS.IN_TRANSIT,
      [TrackingStatus.OUT_FOR_DELIVERY.value]: TRACKING_INTERVALS.OUT_FOR_DELIVERY,
      [TrackingStatus.DELIVERED.value]: TRACKING_INTERVALS.DELIVERED,
      [TrackingStatus.EXCEPTION.value]: TRACKING_INTERVALS.EXCEPTION,
      [TrackingStatus.CANCELLED.value]: TRACKING_INTERVALS.CANCELLED,
      [TrackingStatus.UNKNOWN.value]: TRACKING_INTERVALS.UNKNOWN
    };

    let interval = baseIntervals[status.value];

    // Se deve parar verificação
    if (interval === 0) return 0;

    // Aplicar backoff exponencial para erros
    if (errorCount > 0) {
      interval = Math.min(interval * Math.pow(2, errorCount), 86400); // Max 24h
    }

    // Aumentar intervalo se muitos eventos (possível spam)
    if (eventsCount > 20) {
      interval *= 2;
    }

    // Aumentar intervalo se último evento é muito antigo
    if (hoursSinceLastEvent > 72) { // 3 dias
      interval *= 3;
    }

    // Limites mínimo e máximo
    return Math.max(300, Math.min(interval, 86400)); // 5 min - 24h
  }
}
