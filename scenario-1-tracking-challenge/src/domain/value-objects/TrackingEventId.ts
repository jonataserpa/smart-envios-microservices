import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors';

export class TrackingEventId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value?: string): TrackingEventId {
    if (value && !this.isValid(value)) {
      throw new ValidationError('ID de evento de rastreamento inválido');
    }
    return new TrackingEventId(value || uuidv4());
  }

  static generate(): TrackingEventId {
    return new TrackingEventId(uuidv4());
  }

  private static isValid(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  get value(): string {
    return this._value;
  }

  equals(other: TrackingEventId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
