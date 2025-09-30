import { ValidationError } from '@shared/errors';
import { CARRIERS } from '@shared/constants';

export class CarrierValue {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): CarrierValue {
    if (!this.isValid(value)) {
      throw new ValidationError(`Transportadora inválida: ${value}. Transportadoras suportadas: ${Object.values(CARRIERS).join(', ')}`);
    }
    return new CarrierValue(value);
  }

  private static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    return Object.values(CARRIERS).includes(value as any);
  }

  get value(): string {
    return this._value;
  }

  equals(other: CarrierValue): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
