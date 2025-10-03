import { TrackingCodeId } from '../value-objects/TrackingCodeId';
import { TrackingCodeValue } from '../value-objects/TrackingCodeValue';
import { CarrierValue } from '../value-objects/CarrierValue';
import { TrackingStatus } from '../value-objects/TrackingStatus';
import { TrackingMetadata } from '../value-objects/TrackingMetadata';
import { TrackingEvent } from './TrackingEvent';
import { CreateTrackingCodeData } from '@shared/types';
import { TrackingIntervalStrategy } from '../services/TrackingIntervalStrategy';

export class TrackingCode {
  private constructor(
    private readonly _id: TrackingCodeId,
    private readonly _code: TrackingCodeValue,
    private readonly _carrier: CarrierValue,
    private _status: TrackingStatus,
    private _isActive: boolean,
    private _lastCheckedAt: Date,
    private _nextCheckAt: Date,
    private _checkInterval: number,
    private _events: TrackingEvent[],
    private _metadata: TrackingMetadata,
    private readonly _createdAt: Date = new Date()
  ) {}

  static create(data: CreateTrackingCodeData): TrackingCode {
    const id = TrackingCodeId.generate();
    const code = TrackingCodeValue.create(data.code);
    const carrier = CarrierValue.create(data.carrier);
    
    return new TrackingCode(
      id,
      code,
      carrier,
      TrackingStatus.PENDING,
      true,
      new Date(),
      new Date(Date.now() + 30 * 1000), // 30 segundos
      30, // 30 segundos
      [],
      TrackingMetadata.create(data.metadata),
      new Date()
    );
  }

  addEvents(newEvents: TrackingEvent[]): void {
    // Validar eventos não duplicados
    const existingTimestamps = new Set(
      this._events.map(e => e.timestamp.getTime())
    );
    
    const uniqueEvents = newEvents.filter(
      event => !existingTimestamps.has(event.timestamp.getTime())
    );
    
    if (uniqueEvents.length === 0) return;
    
    // Adicionar eventos e atualizar status
    this._events.push(...uniqueEvents);
    this._events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Derivar novo status do último evento
    const lastEvent = this._events[this._events.length - 1];
    this._status = this.deriveStatusFromEvent(lastEvent);
    
    // Atualizar próxima verificação
    this.updateNextCheck();
    
    // NÃO desativar automaticamente - manter sempre ativo para novas consultas
  }

  updateLastCheck(): void {
    this._lastCheckedAt = new Date();
    this.updateNextCheck();
  }

  incrementErrorCount(): void {
    this._metadata.incrementErrorCount();
    this.updateNextCheck();
  }

  resetErrorCount(): void {
    this._metadata.resetErrorCount();
  }

  reactivate(): void {
    this._isActive = true;
    this._status = TrackingStatus.PENDING;
    this.updateNextCheck();
  }

  recalculateNextCheck(): void {
    // Recalcular próxima verificação baseado no status atual
    // Útil quando o status é alterado manualmente no banco
    this.updateNextCheck();
  }

  private deriveStatusFromEvent(event: TrackingEvent): TrackingStatus {
    if (event.isDelivered) return TrackingStatus.DELIVERED;
    if (event.isException) return TrackingStatus.EXCEPTION;
    
    // Mapear baseado no status do evento
    const statusMap: Record<string, TrackingStatus> = {
      'posted': TrackingStatus.PENDING,
      'in_transit': TrackingStatus.IN_TRANSIT,
      'out_for_delivery': TrackingStatus.OUT_FOR_DELIVERY,
      'delivered': TrackingStatus.DELIVERED,
      'exception': TrackingStatus.EXCEPTION
    };
    
    return statusMap[event.status] || TrackingStatus.IN_TRANSIT;
  }

  private updateNextCheck(): void {
    const interval = TrackingIntervalStrategy.calculate(
      this._status,
      this._events.length,
      this.hoursSinceLastEvent(),
      this._metadata.errorCount
    );
    
    // Sempre manter ativo - não desativar baseado no intervalo
    this._nextCheckAt = new Date(Date.now() + (interval || 1800) * 1000); // 30 min default
    this._checkInterval = interval || 1800;
  }

  private shouldDeactivate(): boolean {
    // Desativar se entregue há mais de 7 dias
    const deliveredEvent = this._events.find(e => e.isDelivered);
    if (deliveredEvent) {
      const daysSinceDelivery = this.daysSince(deliveredEvent.timestamp);
      return daysSinceDelivery > 7;
    }
    
    // Desativar se último evento há mais de 30 dias
    if (this._events.length > 0) {
      const lastEvent = this._events[this._events.length - 1];
      const daysSinceLastEvent = this.daysSince(lastEvent.timestamp);
      return daysSinceLastEvent > 30;
    }
    
    // Desativar se código criado há mais de 45 dias sem eventos
    const daysOld = this.daysSince(this._createdAt);
    return daysOld > 45;
  }

  private daysSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private hoursSinceLastEvent(): number {
    if (this._events.length === 0) return 0;
    const lastEvent = this._events[this._events.length - 1];
    return (Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60);
  }

  // Getters
  get id(): string {
    return this._id.value;
  }

  get code(): string {
    return this._code.value;
  }

  get carrier(): string {
    return this._carrier.value;
  }

  get status(): TrackingStatus {
    return this._status;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastCheckedAt(): Date {
    return this._lastCheckedAt;
  }

  get nextCheckAt(): Date {
    return this._nextCheckAt;
  }

  get checkInterval(): number {
    return this._checkInterval;
  }

  get events(): TrackingEvent[] {
    return [...this._events];
  }

  get metadata(): TrackingMetadata {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      carrier: this.carrier,
      status: this.status.value,
      isActive: this.isActive,
      lastCheckedAt: this.lastCheckedAt,
      nextCheckAt: this.nextCheckAt,
      checkInterval: this.checkInterval,
      events: this.events.map(e => e.toJSON()),
      metadata: this.metadata.toJSON(),
      createdAt: this.createdAt
    };
  }
}
