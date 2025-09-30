// Erros customizados do microserviço de rastreamento

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class TrackingNotFoundError extends DomainError {
  constructor(trackingCode: string) {
    super(`Código de rastreamento não encontrado: ${trackingCode}`, 'TRACKING_NOT_FOUND');
  }
}

export class TrackingAlreadyExistsError extends DomainError {
  constructor(trackingCode: string) {
    super(`Código de rastreamento já existe: ${trackingCode}`, 'TRACKING_ALREADY_EXISTS');
  }
}

export class CarriersApiError extends DomainError {
  constructor(message: string, originalError?: any) {
    super(message, 'CARRIERS_API_ERROR', { originalError });
  }
}

export class CarriersTimeoutError extends CarriersApiError {
  public readonly code = 'CARRIERS_TIMEOUT';
  
  constructor(message: string = 'Timeout na consulta à API Carriers') {
    super(message);
  }
}

export class CarriersServerError extends CarriersApiError {
  public readonly code = 'CARRIERS_SERVER_ERROR';
  
  constructor(message: string = 'Erro interno da API Carriers') {
    super(message);
  }
}

export class RateLimitError extends DomainError {
  constructor(message: string = 'Rate limit atingido') {
    super(message, 'RATE_LIMIT_ERROR');
  }
}

export class CircuitBreakerError extends DomainError {
  constructor(message: string = 'Circuit breaker aberto') {
    super(message, 'CIRCUIT_BREAKER_ERROR');
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, originalError?: any) {
    super(message, 'DATABASE_ERROR', { originalError });
  }
}

export class CacheError extends DomainError {
  constructor(message: string, originalError?: any) {
    super(message, 'CACHE_ERROR', { originalError });
  }
}

export class KafkaError extends DomainError {
  constructor(message: string, originalError?: any) {
    super(message, 'KAFKA_ERROR', { originalError });
  }
}
