// Tipos compartilhados do microserviço de rastreamento

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
  version: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: {
    [key: string]: {
      status: 'connected' | 'disconnected';
      responseTime?: string;
      error?: string;
    };
  };
  metrics?: {
    [key: string]: any;
  };
}

export interface TrackingMetadata {
  contractId?: string;
  customerId?: string;
  origin?: string;
  destination?: string;
  errorCount: number;
  totalChecks: number;
  lastError?: string;
  estimatedDelivery?: Date;
}

export interface CreateTrackingCodeData {
  code: string;
  carrier: string;
  metadata: Partial<TrackingMetadata>;
}

export interface CreateTrackingEventData {
  trackingCodeId: string;
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
  isDelivered?: boolean;
  isException?: boolean;
  carrierRawData?: any;
}

export interface CarriersResponse {
  success: boolean;
  trackingCode: string;
  events: CarriersEvent[];
  error?: string;
}

export interface CarriersEvent {
  date: string;
  date_time?: string;
  status: string;
  location?: string;
  description?: string;
}

export interface TrackingSummary {
  totalEvents: number;
  currentStatus: string;
  isDelivered: boolean;
  estimatedDelivery?: Date;
  daysSincePosted?: number;
  timeline?: {
    posted?: Date;
    inTransit?: Date;
    outForDelivery?: Date;
    delivered?: Date;
  };
}

export interface TrackingListQuery {
  customerId?: string;
  carrier?: string;
  status?: string;
  isDelivered?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  page?: number;
  limit?: number;
  sort?: string;
  includeEvents?: boolean;
}
