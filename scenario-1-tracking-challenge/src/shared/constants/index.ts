// Constantes do microserviço de rastreamento

export const TRACKING_STATUS = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  EXCEPTION: 'exception',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown'
} as const;

export const CARRIERS = {
  CARRIERS: 'Carriers',
  CORREIOS: 'Correios'
} as const;

export const TRACKING_INTERVALS = {
  PENDING: 300,           // 5 min
  IN_TRANSIT: 1800,       // 30 min
  OUT_FOR_DELIVERY: 600,  // 10 min
  DELIVERED: 0,           // Parar
  EXCEPTION: 900,         // 15 min
  CANCELLED: 0,           // Parar
  UNKNOWN: 3600           // 1 hora
} as const;

export const RATE_LIMITS = {
  CARRIERS_API: 100,      // req/min
  REFRESH_ENDPOINT: 20,   // req/min
  GENERAL_API: 500,       // req/min
  BATCH_SIZE: 10,         // códigos por lote
  MAX_CONCURRENT: 5       // requests paralelos
} as const;

export const CACHE_TTL = {
  TRACKING_DATA: 300,     // 5 min
  RATE_LIMIT: 300,        // 5 min
  HEALTH_CHECK: 30,       // 30 seg
  CARRIERS_RESPONSE: 60   // 1 min
} as const;

export const KAFKA_TOPICS = {
  CONTRACT_CREATED: 'smartenvios.contract.created',
  TRACKING_ADDED: 'smartenvios.tracking.added',
  TRACKING_UPDATED: 'smartenvios.tracking.status.updated',
  TRACKING_DELIVERED: 'smartenvios.tracking.delivered',
  TRACKING_ERROR: 'smartenvios.tracking.error'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TRACKING_NOT_FOUND: 'TRACKING_NOT_FOUND',
  TRACKING_ALREADY_EXISTS: 'TRACKING_ALREADY_EXISTS',
  CARRIERS_API_ERROR: 'CARRIERS_API_ERROR',
  CARRIERS_TIMEOUT: 'CARRIERS_TIMEOUT',
  CARRIERS_SERVER_ERROR: 'CARRIERS_SERVER_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  CIRCUIT_BREAKER_ERROR: 'CIRCUIT_BREAKER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  KAFKA_ERROR: 'KAFKA_ERROR'
} as const;

export const TRACKING_CODE_PATTERNS = {
  CARRIERS: /^[A-Z]{2}\d{11}[A-Z]{2}$/,
  CORREIOS: /^[A-Z]{2}\d{9}[A-Z]{2}$/
} as const;

export const CARRIERS_STATUS_MAP = {
  'Objeto postado': 'posted',
  'Em trânsito': 'in_transit',
  'Saiu para entrega': 'out_for_delivery',
  'Entregue': 'delivered',
  'Tentativa de entrega': 'exception',
  'Endereço incorreto': 'exception',
  'Destinatário ausente': 'exception',
  'Cancelado': 'cancelled'
} as const;

export const EXCEPTION_STATUSES = [
  'Tentativa de entrega',
  'Endereço incorreto',
  'Destinatário ausente',
  'Recusado pelo destinatário',
  'Produto avariado'
] as const;

export const DELIVERED_STATUSES = [
  'Entregue',
  'Delivered'
] as const;
