import { ValidationError } from '@shared/errors';
import { TRACKING_CODE_PATTERNS } from '@shared/constants';

export class TrackingCodeValue {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): TrackingCodeValue {
    if (!this.isValid(value)) {
      throw new ValidationError('Formato de código de rastreamento inválido');
    }
    return new TrackingCodeValue(value.toUpperCase());
  }

  private static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Verificar se corresponde a algum padrão conhecido
    return Object.values(TRACKING_CODE_PATTERNS).some(pattern => 
      pattern.test(value.toUpperCase())
    );
  }

  get value(): string {
    return this._value;
  }

  equals(other: TrackingCodeValue): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
