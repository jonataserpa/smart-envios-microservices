import { TrackingEventId } from '../value-objects/TrackingEventId';
import { CreateTrackingEventData } from '@shared/types';

export class TrackingEvent {
  private constructor(
    private readonly _id: TrackingEventId,
    private readonly _trackingCodeId: string,
    private readonly _timestamp: Date,
    private readonly _status: string,
    private readonly _location: string,
    private readonly _description: string,
    private readonly _isDelivered: boolean,
    private readonly _isException: boolean,
    private readonly _carrierRawData: any,
    private readonly _processedAt: Date = new Date()
  ) {}

  static create(data: CreateTrackingEventData): TrackingEvent {
    return new TrackingEvent(
      TrackingEventId.generate(),
      data.trackingCodeId,
      data.timestamp,
      data.status,
      data.location || '',
      data.description,
      data.isDelivered || false,
      data.isException || false,
      data.carrierRawData,
      new Date()
    );
  }

  // Getters
  get id(): string {
    return this._id.value;
  }

  get trackingCodeId(): string {
    return this._trackingCodeId;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get status(): string {
    return this._status;
  }

  get location(): string {
    return this._location;
  }

  get description(): string {
    return this._description;
  }

  get isDelivered(): boolean {
    return this._isDelivered;
  }

  get isException(): boolean {
    return this._isException;
  }

  get carrierRawData(): any {
    return this._carrierRawData;
  }

  get processedAt(): Date {
    return this._processedAt;
  }

  toJSON() {
    return {
      id: this.id,
      trackingCodeId: this.trackingCodeId,
      timestamp: this.timestamp,
      status: this.status,
      location: this.location,
      description: this.description,
      isDelivered: this.isDelivered,
      isException: this.isException,
      processedAt: this.processedAt
    };
  }
}
