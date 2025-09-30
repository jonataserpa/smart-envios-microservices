import { TrackingMetadata as ITrackingMetadata } from '@shared/types';

export class TrackingMetadata {
  private readonly _contractId?: string;
  private readonly _customerId?: string;
  private readonly _origin?: string;
  private readonly _destination?: string;
  private _errorCount: number;
  private _totalChecks: number;
  private _lastError?: string;
  private _estimatedDelivery?: Date;

  constructor(data: Partial<ITrackingMetadata>) {
    this._contractId = data.contractId;
    this._customerId = data.customerId;
    this._origin = data.origin;
    this._destination = data.destination;
    this._errorCount = data.errorCount || 0;
    this._totalChecks = data.totalChecks || 0;
    this._lastError = data.lastError;
    this._estimatedDelivery = data.estimatedDelivery;
  }

  static create(data: Partial<ITrackingMetadata>): TrackingMetadata {
    return new TrackingMetadata(data);
  }

  incrementErrorCount(): void {
    this._errorCount++;
  }

  resetErrorCount(): void {
    this._errorCount = 0;
  }

  incrementTotalChecks(): void {
    this._totalChecks++;
  }

  setLastError(error: string): void {
    this._lastError = error;
  }

  setEstimatedDelivery(date: Date): void {
    this._estimatedDelivery = date;
  }

  // Getters
  get contractId(): string | undefined {
    return this._contractId;
  }

  get customerId(): string | undefined {
    return this._customerId;
  }

  get origin(): string | undefined {
    return this._origin;
  }

  get destination(): string | undefined {
    return this._destination;
  }

  get errorCount(): number {
    return this._errorCount;
  }

  get totalChecks(): number {
    return this._totalChecks;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  get estimatedDelivery(): Date | undefined {
    return this._estimatedDelivery;
  }

  toJSON(): ITrackingMetadata {
    return {
      contractId: this._contractId,
      customerId: this._customerId,
      origin: this._origin,
      destination: this._destination,
      errorCount: this._errorCount,
      totalChecks: this._totalChecks,
      lastError: this._lastError,
      estimatedDelivery: this._estimatedDelivery
    };
  }
}
