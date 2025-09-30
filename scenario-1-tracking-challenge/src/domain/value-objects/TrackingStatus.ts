import { TRACKING_STATUS } from '@shared/constants';

export type TrackingStatusType = typeof TRACKING_STATUS[keyof typeof TRACKING_STATUS];

export class TrackingStatus {
  private readonly _value: TrackingStatusType;

  private constructor(value: TrackingStatusType) {
    this._value = value;
  }

  static create(value: string): TrackingStatus {
    if (!this.isValid(value)) {
      throw new Error(`Status de rastreamento inválido: ${value}`);
    }
    return new TrackingStatus(value as TrackingStatusType);
  }

  static get PENDING(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.PENDING);
  }

  static get IN_TRANSIT(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.IN_TRANSIT);
  }

  static get OUT_FOR_DELIVERY(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.OUT_FOR_DELIVERY);
  }

  static get DELIVERED(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.DELIVERED);
  }

  static get EXCEPTION(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.EXCEPTION);
  }

  static get CANCELLED(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.CANCELLED);
  }

  static get UNKNOWN(): TrackingStatus {
    return new TrackingStatus(TRACKING_STATUS.UNKNOWN);
  }

  private static isValid(value: string): boolean {
    return Object.values(TRACKING_STATUS).includes(value as any);
  }

  get value(): TrackingStatusType {
    return this._value;
  }

  equals(other: TrackingStatus): boolean {
    return this._value === other._value;
  }

  isDelivered(): boolean {
    return this._value === TRACKING_STATUS.DELIVERED;
  }

  isActive(): boolean {
    return this._value !== TRACKING_STATUS.DELIVERED && 
           this._value !== TRACKING_STATUS.CANCELLED;
  }

  isException(): boolean {
    return this._value === TRACKING_STATUS.EXCEPTION;
  }

  toString(): string {
    return this._value;
  }
}
