# PRD-004: Microserviço de Rastreamento de Pedidos

## Visão Geral

**Objetivo**: Desenvolver microserviço automatizado para rastreamento de pedidos, integrando com APIs de transportadoras e fornecendo atualizações em tempo real via eventos para todo o ecossistema SmartEnvios.

**Duração Estimada**: 7-9 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-001 (Infraestrutura Base), PRD-002 (Cotação)

## Contexto de Negócio

O rastreamento automatizado é fundamental para:
- Reduzir trabalho manual de acompanhamento
- Fornecer transparência aos clientes
- Detectar problemas de entrega rapidamente
- Automatizar comunicações baseadas em status
- Gerar dados para análises de performance

## Especificações Técnicas

### 1. Arquitetura do Serviço

#### 1.1 Estrutura do Projeto
```
tracking-service/
├── src/
│   ├── domain/                  # Regras de negócio
│   │   ├── entities/           # Entidades principais
│   │   │   ├── TrackingCode.ts
│   │   │   ├── TrackingEvent.ts
│   │   │   └── ShipmentStatus.ts
│   │   ├── repositories/       # Interfaces de repositório
│   │   ├── services/          # Serviços de domínio
│   │   └── value-objects/     # Objetos de valor
│   ├── application/            # Casos de uso
│   │   ├── commands/          # Command handlers
│   │   ├── queries/           # Query handlers
│   │   ├── schedulers/        # Jobs agendados
│   │   └── event-handlers/    # Event handlers
│   ├── infrastructure/         # Implementações técnicas
│   │   ├── database/          # MongoDB repositories
│   │   ├── carriers/          # Integrações com transportadoras
│   │   ├── messaging/         # Kafka producers/consumers
│   │   ├── scheduling/        # Quartz ou node-cron
│   │   └── cache/            # Redis para otimização
│   ├── presentation/          # APIs e interfaces
│   │   ├── controllers/       # REST controllers
│   │   ├── webhooks/         # Webhook handlers
│   │   └── graphql/          # GraphQL resolvers (futuro)
│   └── shared/               # Utilitários compartilhados
├── tests/                    # Testes completos
├── docs/                     # Documentação específica
└── config/                   # Configurações
```

#### 1.2 Stack Tecnológica
- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: Express.js + Fastify (híbrido)
- **Scheduler**: Node-cron + Bull Queue
- **Database**: MongoDB com TTL automático
- **Cache**: Redis para deduplicação
- **Messaging**: Kafka para eventos
- **HTTP Client**: Axios com retry exponencial
- **Monitoring**: Prometheus + Winston

### 2. Modelo de Dados

#### 2.1 Entidades Principais

```typescript
// TrackingCode Entity
interface TrackingCode {
  id: string;
  code: string; // SM82886187440BM
  carrier: string; // "Carriers"
  status: TrackingStatus;
  customerReference?: string;
  createdAt: Date;
  lastCheckedAt: Date;
  nextCheckAt: Date;
  checkInterval: number; // segundos
  isActive: boolean;
  metadata: TrackingMetadata;
}

// TrackingEvent Entity
interface TrackingEvent {
  id: string;
  trackingCodeId: string;
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
  carrierRawData: any; // Dados originais da transportadora
  processedAt: Date;
  isDelivered: boolean;
  isException: boolean;
}

// TrackingStatus Enum
enum TrackingStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown'
}

// ShipmentSummary (View/Projection)
interface ShipmentSummary {
  trackingCode: string;
  currentStatus: TrackingStatus;
  lastUpdate: Date;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
  metrics: {
    totalEvents: number;
    daysInTransit: number;
    avgCheckInterval: number;
  };
}
```

#### 2.2 Schema MongoDB
```javascript
// TrackingCode Collection
const TrackingCodeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  carrier: { 
    type: String, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(TrackingStatus),
    default: TrackingStatus.PENDING,
    index: true
  },
  customerReference: String,
  lastCheckedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  nextCheckAt: { 
    type: Date, 
    required: true,
    index: true 
  },
  checkInterval: { 
    type: Number, 
    default: 3600, // 1 hora
    min: 300 // 5 minutos mínimo
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  metadata: {
    origin: String,
    destination: String,
    weight: Number,
    dimensions: {
      height: Number,
      width: Number,
      length: Number
    },
    value: Number
  }
}, {
  timestamps: true,
  collection: 'tracking_codes'
});

// TrackingEvent Collection
const TrackingEventSchema = new mongoose.Schema({
  trackingCodeId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrackingCode',
    required: true,
    index: true
  },
  timestamp: { 
    type: Date, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    required: true,
    index: true 
  },
  location: String,
  description: { 
    type: String, 
    required: true 
  },
  carrierRawData: mongoose.Schema.Types.Mixed,
  processedAt: { 
    type: Date, 
    default: Date.now 
  },
  isDelivered: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  isException: { 
    type: Boolean, 
    default: false,
    index: true 
  }
}, {
  timestamps: true,
  collection: 'tracking_events'
});

// Índices compostos para otimização
TrackingCodeSchema.index({ carrier: 1, nextCheckAt: 1 });
TrackingCodeSchema.index({ isActive: 1, nextCheckAt: 1 });
TrackingEventSchema.index({ trackingCodeId: 1, timestamp: -1 });

// TTL para limpeza automática de eventos antigos (90 dias)
TrackingEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

### 3. Integração com API Carriers

#### 3.1 Client da API
```typescript
class CarriersTrackingClient {
  private readonly baseUrl = 'http://api.carriers.com.br';
  private readonly token = process.env.CARRIERS_API_TOKEN;
  
  async trackShipment(trackingCode: string): Promise<CarriersTrackingResponse> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.baseUrl}/client/Carriers/Tracking/${trackingCode}`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json'
      },
      timeout: 15000, // 15s timeout
      retry: 3,
      retryDelay: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 30000)
    };
    
    try {
      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado`);
      }
      if (error.response?.status === 429) {
        throw new RateLimitError('Rate limit atingido para API Carriers');
      }
      throw new CarriersApiError('Erro na comunicação com Carriers API', error);
    }
  }
}

// Mapeamento de dados da API
class CarriersTrackingMapper {
  static fromCarriersResponse(
    response: CarriersTrackingResponse,
    trackingCode: string
  ): TrackingEvent[] {
    if (!response.events || !Array.isArray(response.events)) {
      return [];
    }
    
    return response.events.map(event => ({
      timestamp: new Date(event.date_time),
      status: this.mapStatus(event.status),
      location: event.location,
      description: event.description,
      carrierRawData: event,
      isDelivered: this.isDeliveredStatus(event.status),
      isException: this.isExceptionStatus(event.status)
    }));
  }
  
  private static mapStatus(carrierStatus: string): TrackingStatus {
    const statusMap: Record<string, TrackingStatus> = {
      'Em trânsito': TrackingStatus.IN_TRANSIT,
      'Saiu para entrega': TrackingStatus.OUT_FOR_DELIVERY,
      'Entregue': TrackingStatus.DELIVERED,
      'Tentativa de entrega': TrackingStatus.EXCEPTION,
      'Endereço incorreto': TrackingStatus.EXCEPTION,
      'Cancelado': TrackingStatus.CANCELLED
    };
    
    return statusMap[carrierStatus] || TrackingStatus.UNKNOWN;
  }
  
  private static isDeliveredStatus(status: string): boolean {
    return ['Entregue', 'Delivered'].includes(status);
  }
  
  private static isExceptionStatus(status: string): boolean {
    const exceptionStatuses = [
      'Tentativa de entrega',
      'Endereço incorreto',
      'Destinatário ausente',
      'Recusado pelo destinatário'
    ];
    return exceptionStatuses.some(ex => status.includes(ex));
  }
}
```

### 4. Sistema de Agendamento

#### 4.1 Scheduler Principal
```typescript
class TrackingScheduler {
  private readonly trackingService: TrackingService;
  private readonly logger: Logger;
  private isRunning = false;
  
  constructor(
    trackingService: TrackingService,
    logger: Logger
  ) {
    this.trackingService = trackingService;
    this.logger = logger;
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Job principal: verificar códigos pendentes a cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        await this.processPendingTrackingCodes();
      } catch (error) {
        this.logger.error('Erro no job de rastreamento', { error });
      }
    });
    
    // Job de limpeza: rodar diariamente às 2h
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldEvents();
        await this.updateCheckIntervals();
      } catch (error) {
        this.logger.error('Erro no job de limpeza', { error });
      }
    });
    
    this.logger.info('Tracking scheduler iniciado');
  }
  
  private async processPendingTrackingCodes(): Promise<void> {
    const pendingCodes = await this.trackingService.getPendingTrackingCodes();
    
    if (pendingCodes.length === 0) return;
    
    this.logger.info(`Processando ${pendingCodes.length} códigos de rastreamento`);
    
    // Processar em lotes para não sobrecarregar a API
    const batchSize = 10;
    for (let i = 0; i < pendingCodes.length; i += batchSize) {
      const batch = pendingCodes.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(code => this.processTrackingCode(code))
      );
      
      // Pausa entre lotes para respeitar rate limits
      if (i + batchSize < pendingCodes.length) {
        await this.delay(2000); // 2 segundos
      }
    }
  }
  
  private async processTrackingCode(trackingCode: TrackingCode): Promise<void> {
    try {
      await this.trackingService.updateTrackingCode(trackingCode.code);
      
      this.logger.debug('Código de rastreamento atualizado', {
        code: trackingCode.code,
        carrier: trackingCode.carrier
      });
      
    } catch (error) {
      this.logger.error('Erro ao processar código de rastreamento', {
        code: trackingCode.code,
        error: error.message
      });
      
      // Implementar backoff exponencial para códigos com erro
      await this.trackingService.handleTrackingError(trackingCode.code, error);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 4.2 Estratégias de Check Interval
```typescript
class TrackingIntervalStrategy {
  static calculateNextCheckInterval(
    currentStatus: TrackingStatus,
    eventsCount: number,
    lastEventAge: number // em horas
  ): number {
    // Intervalos base em segundos
    const baseIntervals = {
      [TrackingStatus.PENDING]: 1800,        // 30 min
      [TrackingStatus.IN_TRANSIT]: 3600,     // 1 hora
      [TrackingStatus.OUT_FOR_DELIVERY]: 900, // 15 min
      [TrackingStatus.DELIVERED]: 0,          // Parar verificação
      [TrackingStatus.EXCEPTION]: 1800,       // 30 min
      [TrackingStatus.CANCELLED]: 0,          // Parar verificação
      [TrackingStatus.UNKNOWN]: 7200          // 2 horas
    };
    
    let interval = baseIntervals[currentStatus];
    
    // Se entregue ou cancelado, desativar
    if (interval === 0) {
      return 0;
    }
    
    // Aumentar intervalo se muitos eventos (possível spam)
    if (eventsCount > 20) {
      interval *= 2;
    }
    
    // Aumentar intervalo se último evento é muito antigo
    if (lastEventAge > 72) { // 3 dias
      interval *= 3;
    }
    
    // Limites mínimo e máximo
    return Math.max(300, Math.min(interval, 86400)); // 5 min - 24h
  }
  
  static shouldDeactivateTracking(
    trackingCode: TrackingCode,
    events: TrackingEvent[]
  ): boolean {
    // Desativar se entregue há mais de 7 dias
    const deliveredEvent = events.find(e => e.isDelivered);
    if (deliveredEvent) {
      const daysSinceDelivery = 
        (Date.now() - deliveredEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDelivery > 7;
    }
    
    // Desativar se último evento há mais de 30 dias
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      const daysSinceLastEvent = 
        (Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastEvent > 30;
    }
    
    // Desativar se código criado há mais de 45 dias sem eventos
    const daysOld = 
      (Date.now() - trackingCode.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysOld > 45;
  }
}
```

### 5. Casos de Uso

#### 5.1 Adicionar Código de Rastreamento
```typescript
class AddTrackingCodeUseCase {
  constructor(
    private trackingRepository: TrackingRepository,
    private eventPublisher: EventPublisher,
    private logger: Logger
  ) {}
  
  async execute(command: AddTrackingCodeCommand): Promise<TrackingCode> {
    // Validar entrada
    this.validateCommand(command);
    
    // Verificar se já existe
    const existing = await this.trackingRepository.findByCode(command.code);
    if (existing) {
      // Reativar se estava inativo
      if (!existing.isActive) {
        existing.isActive = true;
        existing.nextCheckAt = new Date();
        await this.trackingRepository.save(existing);
        
        await this.eventPublisher.publish('tracking.reactivated', {
          trackingCode: existing.code,
          carrier: existing.carrier
        });
      }
      
      return existing;
    }
    
    // Criar novo código
    const trackingCode = TrackingCode.create({
      code: command.code,
      carrier: command.carrier,
      customerReference: command.customerReference,
      metadata: command.metadata
    });
    
    // Salvar no banco
    await this.trackingRepository.save(trackingCode);
    
    // Publicar evento
    await this.eventPublisher.publish('tracking.added', {
      trackingCodeId: trackingCode.id,
      code: trackingCode.code,
      carrier: trackingCode.carrier
    });
    
    this.logger.info('Código de rastreamento adicionado', {
      code: trackingCode.code,
      carrier: trackingCode.carrier
    });
    
    return trackingCode;
  }
  
  private validateCommand(command: AddTrackingCodeCommand): void {
    if (!command.code || !command.carrier) {
      throw new ValidationError('Código e transportadora são obrigatórios');
    }
    
    if (!this.isValidTrackingCode(command.code)) {
      throw new ValidationError('Formato de código de rastreamento inválido');
    }
  }
  
  private isValidTrackingCode(code: string): boolean {
    // Validar formato específico de cada transportadora
    const patterns = {
      'Carriers': /^[A-Z]{2}\d{11}[A-Z]{2}$/,
      'Correios': /^[A-Z]{2}\d{9}[A-Z]{2}$/
    };
    
    return Object.values(patterns).some(pattern => pattern.test(code));
  }
}
```

#### 5.2 Atualizar Rastreamento
```typescript
class UpdateTrackingUseCase {
  constructor(
    private trackingRepository: TrackingRepository,
    private carriersClient: CarriersTrackingClient,
    private eventRepository: TrackingEventRepository,
    private cacheService: TrackingCacheService,
    private eventPublisher: EventPublisher,
    private logger: Logger
  ) {}
  
  async execute(trackingCode: string): Promise<TrackingEvent[]> {
    // Buscar código no banco
    const tracking = await this.trackingRepository.findByCode(trackingCode);
    if (!tracking || !tracking.isActive) {
      throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado ou inativo`);
    }
    
    try {
      // Verificar cache de deduplicação (evitar calls muito frequentes)
      const cacheKey = `tracking:${trackingCode}:last_check`;
      const lastCheck = await this.cacheService.get(cacheKey);
      
      if (lastCheck && (Date.now() - parseInt(lastCheck) < 300000)) { // 5 min
        this.logger.debug('Cache hit - pulando verificação', { trackingCode });
        return await this.eventRepository.findByTrackingCode(tracking.id);
      }
      
      // Buscar da API da transportadora
      const response = await this.carriersClient.trackShipment(trackingCode);
      const newEvents = CarriersTrackingMapper.fromCarriersResponse(response, trackingCode);
      
      // Processar novos eventos
      const savedEvents = await this.processNewEvents(tracking, newEvents);
      
      // Atualizar status do código
      await this.updateTrackingStatus(tracking, savedEvents);
      
      // Cache da última verificação
      await this.cacheService.set(cacheKey, Date.now().toString(), 300); // 5 min TTL
      
      this.logger.info('Rastreamento atualizado', {
        trackingCode,
        newEvents: savedEvents.length,
        currentStatus: tracking.status
      });
      
      return savedEvents;
      
    } catch (error) {
      // Atualizar timestamp de verificação mesmo com erro
      tracking.lastCheckedAt = new Date();
      tracking.nextCheckAt = this.calculateNextCheck(tracking, error);
      await this.trackingRepository.save(tracking);
      
      throw error;
    }
  }
  
  private async processNewEvents(
    tracking: TrackingCode,
    newEvents: TrackingEvent[]
  ): Promise<TrackingEvent[]> {
    const existingEvents = await this.eventRepository.findByTrackingCode(tracking.id);
    const existingTimestamps = new Set(
      existingEvents.map(e => e.timestamp.getTime())
    );
    
    // Filtrar apenas eventos realmente novos
    const uniqueNewEvents = newEvents.filter(
      event => !existingTimestamps.has(event.timestamp.getTime())
    );
    
    if (uniqueNewEvents.length === 0) {
      return existingEvents;
    }
    
    // Salvar novos eventos
    const savedEvents: TrackingEvent[] = [];
    for (const event of uniqueNewEvents) {
      event.trackingCodeId = tracking.id;
      const saved = await this.eventRepository.save(event);
      savedEvents.push(saved);
      
      // Publicar evento individual
      await this.eventPublisher.publish('tracking.event.new', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        event: {
          timestamp: event.timestamp,
          status: event.status,
          location: event.location,
          description: event.description,
          isDelivered: event.isDelivered,
          isException: event.isException
        }
      });
    }
    
    return [...existingEvents, ...savedEvents];
  }
  
  private async updateTrackingStatus(
    tracking: TrackingCode,
    allEvents: TrackingEvent[]
  ): Promise<void> {
    const lastEvent = allEvents[allEvents.length - 1];
    const previousStatus = tracking.status;
    
    if (lastEvent) {
      tracking.status = this.deriveTrackingStatus(lastEvent);
    }
    
    // Calcular próxima verificação
    tracking.lastCheckedAt = new Date();
    tracking.nextCheckAt = this.calculateNextCheck(tracking, null);
    
    // Desativar se necessário
    if (TrackingIntervalStrategy.shouldDeactivateTracking(tracking, allEvents)) {
      tracking.isActive = false;
      
      await this.eventPublisher.publish('tracking.deactivated', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        reason: 'automatic_cleanup'
      });
    }
    
    await this.trackingRepository.save(tracking);
    
    // Publicar mudança de status se houve alteração
    if (previousStatus !== tracking.status) {
      await this.eventPublisher.publish('tracking.status.changed', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        previousStatus,
        currentStatus: tracking.status,
        isDelivered: tracking.status === TrackingStatus.DELIVERED
      });
    }
  }
  
  private deriveTrackingStatus(lastEvent: TrackingEvent): TrackingStatus {
    if (lastEvent.isDelivered) {
      return TrackingStatus.DELIVERED;
    }
    
    if (lastEvent.isException) {
      return TrackingStatus.EXCEPTION;
    }
    
    // Mapear baseado no status do evento
    const statusFromEvent = TrackingStatus[lastEvent.status as keyof typeof TrackingStatus];
    return statusFromEvent || TrackingStatus.IN_TRANSIT;
  }
  
  private calculateNextCheck(tracking: TrackingCode, error: Error | null): Date {
    let intervalSeconds: number;
    
    if (error) {
      // Backoff exponencial em caso de erro
      const baseInterval = 3600; // 1 hora
      const errorCount = tracking.metadata?.errorCount || 0;
      intervalSeconds = Math.min(baseInterval * Math.pow(2, errorCount), 86400); // Max 24h
    } else {
      // Intervalo normal baseado no status
      intervalSeconds = TrackingIntervalStrategy.calculateNextCheckInterval(
        tracking.status,
        0, // TODO: implementar contagem de eventos
        0  // TODO: implementar cálculo de idade do último evento
      );
    }
    
    return new Date(Date.now() + intervalSeconds * 1000);
  }
}
```

### 6. APIs e Endpoints

#### 6.1 REST APIs
```typescript
// controllers/TrackingController.ts
@Controller('/api/v1/tracking')
export class TrackingController {
  constructor(
    private addTrackingUseCase: AddTrackingCodeUseCase,
    private updateTrackingUseCase: UpdateTrackingUseCase,
    private getTrackingUseCase: GetTrackingUseCase
  ) {}
  
  @Post('/')
  @ValidateBody(AddTrackingCodeSchema)
  async addTrackingCode(@Body() body: AddTrackingCodeRequest): Promise<ApiResponse<TrackingCodeResponse>> {
    try {
      const trackingCode = await this.addTrackingUseCase.execute({
        code: body.code,
        carrier: body.carrier,
        customerReference: body.customerReference,
        metadata: body.metadata
      });
      
      return {
        success: true,
        data: TrackingCodeMapper.toResponse(trackingCode),
        message: 'Código de rastreamento adicionado com sucesso'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  
  @Get('/:code')
  async getTracking(@Param('code') code: string): Promise<ApiResponse<ShipmentSummaryResponse>> {
    try {
      const summary = await this.getTrackingUseCase.execute(code);
      
      return {
        success: true,
        data: summary,
        metadata: {
          lastUpdate: new Date(),
          version: '1.0'
        }
      };
    } catch (error) {
      if (error instanceof TrackingNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Post('/:code/refresh')
  async refreshTracking(@Param('code') code: string): Promise<ApiResponse<TrackingEvent[]>> {
    try {
      const events = await this.updateTrackingUseCase.execute(code);
      
      return {
        success: true,
        data: events.map(TrackingEventMapper.toResponse),
        message: 'Rastreamento atualizado com sucesso'
      };
    } catch (error) {
      if (error instanceof TrackingNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }
  
  @Get('/bulk/:codes')
  async getBulkTracking(@Param('codes') codes: string): Promise<ApiResponse<ShipmentSummaryResponse[]>> {
    const codeList = codes.split(',').slice(0, 50); // Máximo 50 códigos
    
    const summaries = await Promise.allSettled(
      codeList.map(code => this.getTrackingUseCase.execute(code.trim()))
    );
    
    const results = summaries.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          trackingCode: codeList[index],
          error: result.reason.message
        };
      }
    });
    
    return {
      success: true,
      data: results.filter(r => !r.error),
      errors: results.filter(r => r.error).map(r => r.error)
    };
  }
}
```

#### 6.2 Webhooks para Integrações
```typescript
// controllers/WebhookController.ts
@Controller('/api/v1/webhooks')
export class WebhookController {
  constructor(
    private trackingService: TrackingService,
    private webhookValidator: WebhookValidator,
    private logger: Logger
  ) {}
  
  @Post('/carriers')
  async handleCarriersWebhook(@Body() body: any, @Headers() headers: any): Promise<void> {
    // Validar assinatura do webhook
    if (!this.webhookValidator.validateCarriersSignature(body, headers)) {
      throw new UnauthorizedException('Assinatura inválida');
    }
    
    try {
      const trackingCode = body.tracking_code;
      const eventData = body.event;
      
      this.logger.info('Webhook recebido da Carriers', {
        trackingCode,
        eventType: eventData.type
      });
      
      // Processar update em background
      setImmediate(async () => {
        try {
          await this.trackingService.processWebhookUpdate(trackingCode, eventData);
        } catch (error) {
          this.logger.error('Erro ao processar webhook', {
            trackingCode,
            error: error.message
          });
        }
      });
      
      // Resposta rápida para o webhook
      return { received: true };
      
    } catch (error) {
      this.logger.error('Erro no webhook handler', { error: error.message });
      throw new BadRequestException('Erro ao processar webhook');
    }
  }
}
```

### 7. Sistema de Eventos

#### 7.1 Event Publishers
```typescript
// infrastructure/messaging/EventPublisher.ts
export class KafkaEventPublisher implements EventPublisher {
  private readonly producer: Producer;
  private readonly logger: Logger;
  
  constructor(kafkaClient: Kafka, logger: Logger) {
    this.producer = kafkaClient.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });
    this.logger = logger;
  }
  
  async publish(eventType: string, data: any): Promise<void> {
    const event = {
      id: nanoid(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
      source: 'tracking-service',
      version: '1.0'
    };
    
    const topic = this.getTopicForEvent(eventType);
    
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: data.trackingCode || data.trackingCodeId,
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'content-type': 'application/json'
          }
        }]
      });
      
      this.logger.debug('Evento publicado', {
        eventType,
        topic,
        eventId: event.id
      });
      
    } catch (error) {
      this.logger.error('Erro ao publicar evento', {
        eventType,
        error: error.message
      });
      throw error;
    }
  }
  
  private getTopicForEvent(eventType: string): string {
    const topicMap: Record<string, string> = {
      'tracking.added': 'smartenvios.tracking.lifecycle',
      'tracking.status.changed': 'smartenvios.tracking.status',
      'tracking.event.new': 'smartenvios.tracking.events',
      'tracking.delivered': 'smartenvios.tracking.delivered',
      'tracking.exception': 'smartenvios.tracking.exceptions',
      'tracking.deactivated': 'smartenvios.tracking.lifecycle'
    };
    
    return topicMap[eventType] || 'smartenvios.tracking.general';
  }
}
```

#### 7.2 Event Consumers
```typescript
// application/event-handlers/TrackingEventHandler.ts
export class TrackingEventHandler {
  constructor(
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private logger: Logger
  ) {}
  
  @EventHandler('tracking.status.changed')
  async handleStatusChanged(event: TrackingStatusChangedEvent): Promise<void> {
    try {
      // Enviar notificação se status importante
      if (this.isImportantStatusChange(event.previousStatus, event.currentStatus)) {
        await this.notificationService.sendTrackingUpdate({
          trackingCode: event.trackingCode,
          status: event.currentStatus,
          isDelivered: event.isDelivered
        });
      }
      
      // Registrar métrica
      await this.analyticsService.recordStatusChange({
        carrier: event.carrier,
        fromStatus: event.previousStatus,
        toStatus: event.currentStatus,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error('Erro ao processar mudança de status', {
        trackingCode: event.trackingCode,
        error: error.message
      });
    }
  }
  
  @EventHandler('tracking.delivered')
  async handleDelivered(event: TrackingDeliveredEvent): Promise<void> {
    try {
      // Notificação de entrega
      await this.notificationService.sendDeliveryConfirmation({
        trackingCode: event.trackingCode,
        deliveredAt: event.deliveredAt,
        location: event.location
      });
      
      // Métricas de entrega
      await this.analyticsService.recordDelivery({
        trackingCode: event.trackingCode,
        carrier: event.carrier,
        deliveryTime: event.totalTransitTime
      });
      
    } catch (error) {
      this.logger.error('Erro ao processar entrega', {
        trackingCode: event.trackingCode,
        error: error.message
      });
    }
  }
  
  private isImportantStatusChange(from: TrackingStatus, to: TrackingStatus): boolean {
    const importantChanges = [
      [TrackingStatus.PENDING, TrackingStatus.IN_TRANSIT],
      [TrackingStatus.IN_TRANSIT, TrackingStatus.OUT_FOR_DELIVERY],
      [TrackingStatus.OUT_FOR_DELIVERY, TrackingStatus.DELIVERED],
      [TrackingStatus.IN_TRANSIT, TrackingStatus.EXCEPTION]
    ];
    
    return importantChanges.some(([fromStatus, toStatus]) => 
      from === fromStatus && to === toStatus
    );
  }
}
```

### 8. Monitoramento e Métricas

#### 8.1 Métricas Prometheus
```typescript
// monitoring/TrackingMetrics.ts
export class TrackingMetrics {
  private readonly trackingRequestsTotal = new Counter({
    name: 'tracking_requests_total',
    help: 'Total tracking requests',
    labelNames: ['carrier', 'status', 'source']
  });
  
  private readonly trackingUpdateDuration = new Histogram({
    name: 'tracking_update_duration_seconds',
    help: 'Time spent updating tracking information',
    labelNames: ['carrier', 'success'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  });
  
  private readonly activeTrackingCodes = new Gauge({
    name: 'tracking_codes_active',
    help: 'Number of active tracking codes',
    labelNames: ['carrier', 'status']
  });
  
  private readonly apiErrorsTotal = new Counter({
    name: 'tracking_api_errors_total',
    help: 'Total API errors by carrier',
    labelNames: ['carrier', 'error_type']
  });
  
  recordTrackingRequest(carrier: string, status: string, source: string): void {
    this.trackingRequestsTotal.inc({ carrier, status, source });
  }
  
  recordUpdateDuration(carrier: string, success: boolean, duration: number): void {
    this.trackingUpdateDuration.observe({ carrier, success: success.toString() }, duration);
  }
  
  updateActiveCodesGauge(carrier: string, status: string, count: number): void {
    this.activeTrackingCodes.set({ carrier, status }, count);
  }
  
  recordApiError(carrier: string, errorType: string): void {
    this.apiErrorsTotal.inc({ carrier, error_type: errorType });
  }
}
```

#### 8.2 Health Checks
```typescript
// health/TrackingHealthCheck.ts
export class TrackingHealthCheck {
  constructor(
    private trackingRepository: TrackingRepository,
    private carriersClient: CarriersTrackingClient,
    private kafkaProducer: Producer
  ) {}
  
  async checkHealth(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCarriersApi(),
      this.checkKafka()
    ]);
    
    const results = checks.map((result, index) => ({
      component: ['database', 'carriers_api', 'kafka'][index],
      status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: result.status === 'fulfilled' ? result.value : result.reason.message
    }));
    
    const isHealthy = results.every(r => r.status === 'healthy');
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks: results
    };
  }
  
  private async checkDatabase(): Promise<string> {
    await this.trackingRepository.ping();
    return 'Database connection OK';
  }
  
  private async checkCarriersApi(): Promise<string> {
    // Fazer uma chamada simples para verificar conectividade
    try {
      await this.carriersClient.healthCheck();
      return 'Carriers API connection OK';
    } catch (error) {
      throw new Error(`Carriers API unreachable: ${error.message}`);
    }
  }
  
  private async checkKafka(): Promise<string> {
    // Verificar se consegue conectar com Kafka
    await this.kafkaProducer.send({
      topic: 'healthcheck',
      messages: [{ value: 'ping' }]
    });
    return 'Kafka connection OK';
  }
}
```

## Entregáveis

### Fase 1: Core Infrastructure (3 dias)
- [ ] Setup do projeto e dependências
- [ ] Modelos de dados e repositories
- [ ] Client da API Carriers
- [ ] Sistema básico de scheduling
- [ ] Health checks e monitoramento

### Fase 2: Business Logic (3 dias)
- [ ] Casos de uso principais
- [ ] Lógica de intervalos dinâmicos
- [ ] Sistema de deduplicação
- [ ] Processamento de eventos
- [ ] Error handling e retry logic

### Fase 3: APIs e Integração (2 dias)
- [ ] REST endpoints completos
- [ ] Webhook handlers
- [ ] Event publishing/consuming
- [ ] Validações e middlewares
- [ ] Documentação OpenAPI

### Fase 4: Qualidade e Operações (1 dia)
- [ ] Testes unitários e integração
- [ ] Métricas e observabilidade
- [ ] Performance tuning
- [ ] Documentação operacional

## Critérios de Aceitação

1. **Performance**: Processar 1000+ códigos/hora
2. **Reliability**: Uptime > 99.9%
3. **Accuracy**: < 0.1% de eventos duplicados
4. **Efficiency**: Rate limit compliance (< 100 req/min)
5. **Quality**: Cobertura de testes > 85%

## Métricas de Sucesso

- **Latência média**: < 500ms para consultas
- **Throughput**: 1000+ updates/hora
- **Error rate**: < 1% de falhas de API
- **Cache hit rate**: > 60% em consultas repetidas

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rate limiting da API | Alta | Médio | Backoff exponencial e cache |
| Volume alto de eventos | Média | Alto | Processamento em lotes e filas |
| Dados inconsistentes | Baixa | Alto | Validação rigorosa e reconciliação |

## Próximos Passos

Após conclusão, seguir para PRD-005: Frontend - Tela de Contratação.

---

**Responsável**: Backend Team  
**Revisores**: Tech Lead, Product Owner  
**Última Atualização**: Janeiro 2025
