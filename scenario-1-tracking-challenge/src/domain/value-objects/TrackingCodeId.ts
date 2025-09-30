import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors';

export class TrackingCodeId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value?: string): TrackingCodeId {
    if (value && !this.isValid(value)) {
      throw new ValidationError('ID de código de rastreamento inválido');
    }
    return new TrackingCodeId(value || uuidv4());
  }

  static generate(): TrackingCodeId {
    return new TrackingCodeId(uuidv4());
  }

  private static isValid(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  get value(): string {
    return this._value;
  }

  equals(other: TrackingCodeId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
