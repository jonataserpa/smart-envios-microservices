# PRD-002: Implementação Core do Microserviço de Rastreamento

## Visão Geral

**Objetivo**: Implementar a lógica central do microserviço de rastreamento, incluindo domínio, casos de uso, integração com API Carriers e sistema de agendamento automático.

**Duração Estimada**: 3-4 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-001 (Infraestrutura Base)  
**Contexto**: Core do desafio técnico

## Escopo Técnico

### 1. Domínio do Rastreamento

#### 1.1 Entidades Principais

**TrackingCode - Aggregate Root**
```typescript
export class TrackingCode {
  private constructor(
    private readonly _id: TrackingCodeId,
    private readonly _code: string,
    private readonly _carrier: string,
    private _status: TrackingStatus,
    private _isActive: boolean,
    private _lastCheckedAt: Date,
    private _nextCheckAt: Date,
    private _checkInterval: number,
    private _events: TrackingEvent[],
    private _metadata: TrackingMetadata,
    private readonly _createdAt: Date = new Date()
  ) {}

  static create(data: CreateTrackingCodeData): TrackingCode {
    const id = TrackingCodeId.generate();
    const code = TrackingCodeValue.create(data.code);
    const carrier = CarrierValue.create(data.carrier);
    
    return new TrackingCode(
      id,
      code.value,
      carrier.value,
      TrackingStatus.PENDING,
      true,
      new Date(),
      new Date(Date.now() + 5 * 60 * 1000), // 5 min
      300, // 5 min em segundos
      [],
      TrackingMetadata.create(data.metadata),
      new Date()
    );
  }

  addEvents(newEvents: TrackingEvent[]): void {
    // Validar eventos não duplicados
    const existingTimestamps = new Set(
      this._events.map(e => e.timestamp.getTime())
    );
    
    const uniqueEvents = newEvents.filter(
      event => !existingTimestamps.has(event.timestamp.getTime())
    );
    
    if (uniqueEvents.length === 0) return;
    
    // Adicionar eventos e atualizar status
    this._events.push(...uniqueEvents);
    this._events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Derivar novo status do último evento
    const lastEvent = this._events[this._events.length - 1];
    this._status = this.deriveStatusFromEvent(lastEvent);
    
    // Atualizar próxima verificação
    this.updateNextCheck();
    
    // Verificar se deve desativar
    if (this.shouldDeactivate()) {
      this._isActive = false;
    }
  }

  updateLastCheck(): void {
    this._lastCheckedAt = new Date();
    this.updateNextCheck();
  }

  incrementErrorCount(): void {
    this._metadata.incrementErrorCount();
    this.updateNextCheck();
  }

  resetErrorCount(): void {
    this._metadata.resetErrorCount();
  }

  private deriveStatusFromEvent(event: TrackingEvent): TrackingStatus {
    if (event.isDelivered) return TrackingStatus.DELIVERED;
    if (event.isException) return TrackingStatus.EXCEPTION;
    
    // Mapear baseado no status do evento
    const statusMap: Record<string, TrackingStatus> = {
      'posted': TrackingStatus.PENDING,
      'in_transit': TrackingStatus.IN_TRANSIT,
      'out_for_delivery': TrackingStatus.OUT_FOR_DELIVERY,
      'delivered': TrackingStatus.DELIVERED,
      'exception': TrackingStatus.EXCEPTION
    };
    
    return statusMap[event.status] || TrackingStatus.IN_TRANSIT;
  }

  private updateNextCheck(): void {
    const interval = TrackingIntervalStrategy.calculate(
      this._status,
      this._events.length,
      this.hoursSinceLastEvent(),
      this._metadata.errorCount
    );
    
    if (interval === 0) {
      this._isActive = false;
      return;
    }
    
    this._nextCheckAt = new Date(Date.now() + interval * 1000);
    this._checkInterval = interval;
  }

  private shouldDeactivate(): boolean {
    // Desativar se entregue há mais de 7 dias
    const deliveredEvent = this._events.find(e => e.isDelivered);
    if (deliveredEvent) {
      const daysSinceDelivery = this.daysSince(deliveredEvent.timestamp);
      return daysSinceDelivery > 7;
    }
    
    // Desativar se último evento há mais de 30 dias
    if (this._events.length > 0) {
      const lastEvent = this._events[this._events.length - 1];
      const daysSinceLastEvent = this.daysSince(lastEvent.timestamp);
      return daysSinceLastEvent > 30;
    }
    
    // Desativar se código criado há mais de 45 dias sem eventos
    const daysOld = this.daysSince(this._createdAt);
    return daysOld > 45;
  }

  private daysSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private hoursSinceLastEvent(): number {
    if (this._events.length === 0) return 0;
    const lastEvent = this._events[this._events.length - 1];
    return (Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60);
  }

  // Getters
  get id(): string { return this._id.value; }
  get code(): string { return this._code; }
  get carrier(): string { return this._carrier; }
  get status(): TrackingStatus { return this._status; }
  get isActive(): boolean { return this._isActive; }
  get lastCheckedAt(): Date { return this._lastCheckedAt; }
  get nextCheckAt(): Date { return this._nextCheckAt; }
  get checkInterval(): number { return this._checkInterval; }
  get events(): TrackingEvent[] { return [...this._events]; }
  get metadata(): TrackingMetadata { return this._metadata; }
  get createdAt(): Date { return this._createdAt; }
}
```

**TrackingEvent - Entity**
```typescript
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
  get id(): string { return this._id.value; }
  get trackingCodeId(): string { return this._trackingCodeId; }
  get timestamp(): Date { return this._timestamp; }
  get status(): string { return this._status; }
  get location(): string { return this._location; }
  get description(): string { return this._description; }
  get isDelivered(): boolean { return this._isDelivered; }
  get isException(): boolean { return this._isException; }
  get carrierRawData(): any { return this._carrierRawData; }
  get processedAt(): Date { return this._processedAt; }
}
```

#### 1.2 Value Objects

**TrackingStatus**
```typescript
export enum TrackingStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown'
}
```

**TrackingIntervalStrategy - Domain Service**
```typescript
export class TrackingIntervalStrategy {
  static calculate(
    status: TrackingStatus,
    eventsCount: number,
    hoursSinceLastEvent: number,
    errorCount: number
  ): number {
    // Intervalos base em segundos
    const baseIntervals: Record<TrackingStatus, number> = {
      [TrackingStatus.PENDING]: 300,           // 5 min
      [TrackingStatus.IN_TRANSIT]: 1800,       // 30 min
      [TrackingStatus.OUT_FOR_DELIVERY]: 600,  // 10 min
      [TrackingStatus.DELIVERED]: 0,           // Parar
      [TrackingStatus.EXCEPTION]: 900,         // 15 min
      [TrackingStatus.CANCELLED]: 0,           // Parar
      [TrackingStatus.UNKNOWN]: 3600           // 1 hora
    };

    let interval = baseIntervals[status];

    // Se deve parar verificação
    if (interval === 0) return 0;

    // Aplicar backoff exponencial para erros
    if (errorCount > 0) {
      interval = Math.min(interval * Math.pow(2, errorCount), 86400); // Max 24h
    }

    // Aumentar intervalo se muitos eventos (possível spam)
    if (eventsCount > 20) {
      interval *= 2;
    }

    // Aumentar intervalo se último evento é muito antigo
    if (hoursSinceLastEvent > 72) { // 3 dias
      interval *= 3;
    }

    // Limites mínimo e máximo
    return Math.max(300, Math.min(interval, 86400)); // 5 min - 24h
  }
}
```

### 2. Casos de Uso (Application Layer)

#### 2.1 Adicionar Código de Rastreamento

```typescript
export class AddTrackingCodeUseCase {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(command: AddTrackingCodeCommand): Promise<TrackingCodeResponse> {
    try {
      // Validar comando
      this.validateCommand(command);

      // Verificar se já existe
      const existing = await this.trackingRepository.findByCode(command.code);
      if (existing && existing.isActive) {
        this.logger.info('Código de rastreamento já existe e está ativo', {
          code: command.code
        });
        return TrackingCodeMapper.toResponse(existing);
      }

      // Reativar se existir mas inativo
      if (existing && !existing.isActive) {
        existing.reactivate();
        await this.trackingRepository.save(existing);
        
        await this.eventPublisher.publish('tracking.reactivated', {
          trackingCodeId: existing.id,
          code: existing.code,
          carrier: existing.carrier
        });

        this.logger.info('Código de rastreamento reativado', {
          code: command.code
        });

        return TrackingCodeMapper.toResponse(existing);
      }

      // Criar novo código
      const trackingCode = TrackingCode.create({
        code: command.code,
        carrier: command.carrier,
        metadata: {
          contractId: command.contractId,
          customerId: command.customerId,
          origin: command.origin,
          destination: command.destination
        }
      });

      // Salvar no repositório
      await this.trackingRepository.save(trackingCode);

      // Publicar evento
      await this.eventPublisher.publish('tracking.added', {
        trackingCodeId: trackingCode.id,
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        contractId: command.contractId,
        customerId: command.customerId
      });

      this.logger.info('Código de rastreamento adicionado com sucesso', {
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        trackingCodeId: trackingCode.id
      });

      return TrackingCodeMapper.toResponse(trackingCode);

    } catch (error) {
      this.logger.error('Erro ao adicionar código de rastreamento', {
        code: command.code,
        error: error.message
      });
      throw error;
    }
  }

  private validateCommand(command: AddTrackingCodeCommand): void {
    if (!command.code || !command.carrier) {
      throw new ValidationError('Código e transportadora são obrigatórios');
    }

    if (!this.isValidTrackingCode(command.code, command.carrier)) {
      throw new ValidationError('Formato de código de rastreamento inválido');
    }
  }

  private isValidTrackingCode(code: string, carrier: string): boolean {
    const patterns: Record<string, RegExp> = {
      'Carriers': /^[A-Z]{2}\d{11}[A-Z]{2}$/,
      'Correios': /^[A-Z]{2}\d{9}[A-Z]{2}$/
    };

    const pattern = patterns[carrier];
    return pattern ? pattern.test(code) : false;
  }
}
```

#### 2.2 Atualizar Rastreamento

```typescript
export class UpdateTrackingUseCase {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly carriersClient: CarriersTrackingClient,
    private readonly eventPublisher: EventPublisher,
    private readonly cacheService: TrackingCacheService,
    private readonly logger: Logger
  ) {}

  async execute(trackingCode: string): Promise<TrackingEvent[]> {
    const tracking = await this.trackingRepository.findByCode(trackingCode);
    if (!tracking || !tracking.isActive) {
      throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado ou inativo`);
    }

    try {
      // Verificar rate limiting
      await this.checkRateLimit(trackingCode);

      // Buscar dados da API Carriers
      const carriersResponse = await this.carriersClient.trackShipment(trackingCode);
      
      // Mapear eventos da resposta
      const newEvents = this.mapCarriersEvents(carriersResponse, trackingCode);

      // Processar novos eventos
      const previousStatus = tracking.status;
      tracking.addEvents(newEvents);
      tracking.updateLastCheck();

      // Salvar mudanças
      await this.trackingRepository.save(tracking);

      // Publicar eventos se houve mudanças
      if (newEvents.length > 0) {
        await this.publishTrackingEvents(tracking, newEvents, previousStatus);
      }

      // Cache da última verificação
      await this.cacheService.setLastCheck(trackingCode, Date.now());

      this.logger.info('Rastreamento atualizado com sucesso', {
        trackingCode,
        newEvents: newEvents.length,
        currentStatus: tracking.status,
        nextCheck: tracking.nextCheckAt
      });

      return tracking.events;

    } catch (error) {
      // Atualizar timestamp mesmo com erro
      tracking.updateLastCheck();
      
      if (error instanceof CarriersApiError) {
        tracking.incrementErrorCount();
      }
      
      await this.trackingRepository.save(tracking);

      this.logger.error('Erro ao atualizar rastreamento', {
        trackingCode,
        error: error.message,
        errorType: error.constructor.name
      });

      throw error;
    }
  }

  private async checkRateLimit(trackingCode: string): Promise<void> {
    const cacheKey = `rate_limit:${trackingCode}`;
    const lastCheck = await this.cacheService.get(cacheKey);
    
    if (lastCheck && (Date.now() - parseInt(lastCheck) < 300000)) { // 5 min
      throw new RateLimitError('Rate limit atingido para este código');
    }
  }

  private mapCarriersEvents(response: CarriersResponse, trackingCode: string): TrackingEvent[] {
    if (!response.events || !Array.isArray(response.events)) {
      return [];
    }

    return response.events.map(carriersEvent => 
      TrackingEvent.create({
        trackingCodeId: '', // Será preenchido pelo aggregate
        timestamp: new Date(carriersEvent.date_time || carriersEvent.date),
        status: this.mapCarriersStatus(carriersEvent.status),
        location: carriersEvent.location || '',
        description: carriersEvent.description || carriersEvent.status,
        isDelivered: this.isDeliveredStatus(carriersEvent.status),
        isException: this.isExceptionStatus(carriersEvent.status),
        carrierRawData: carriersEvent
      })
    );
  }

  private mapCarriersStatus(carriersStatus: string): string {
    const statusMap: Record<string, string> = {
      'Objeto postado': 'posted',
      'Em trânsito': 'in_transit',
      'Saiu para entrega': 'out_for_delivery',
      'Entregue': 'delivered',
      'Tentativa de entrega': 'exception',
      'Endereço incorreto': 'exception',
      'Destinatário ausente': 'exception',
      'Cancelado': 'cancelled'
    };

    return statusMap[carriersStatus] || 'unknown';
  }

  private isDeliveredStatus(status: string): boolean {
    return ['Entregue', 'Delivered'].includes(status);
  }

  private isExceptionStatus(status: string): boolean {
    const exceptionStatuses = [
      'Tentativa de entrega',
      'Endereço incorreto',
      'Destinatário ausente',
      'Recusado pelo destinatário',
      'Produto avariado'
    ];
    return exceptionStatuses.some(ex => status.includes(ex));
  }

  private async publishTrackingEvents(
    tracking: TrackingCode,
    newEvents: TrackingEvent[],
    previousStatus: TrackingStatus
  ): Promise<void> {
    // Publicar mudança de status se houve alteração
    if (previousStatus !== tracking.status) {
      await this.eventPublisher.publish('tracking.status.changed', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        previousStatus,
        currentStatus: tracking.status,
        isDelivered: tracking.status === TrackingStatus.DELIVERED,
        timestamp: new Date().toISOString()
      });
    }

    // Publicar cada novo evento
    for (const event of newEvents) {
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

    // Publicar evento especial se entregue
    if (tracking.status === TrackingStatus.DELIVERED) {
      await this.eventPublisher.publish('tracking.delivered', {
        trackingCodeId: tracking.id,
        trackingCode: tracking.code,
        deliveredAt: new Date().toISOString(),
        totalEvents: tracking.events.length
      });
    }
  }
}
```

### 3. Integração com API Carriers

#### 3.1 Cliente HTTP Resiliente

```typescript
export class CarriersTrackingClient implements TrackingClient {
  private readonly httpClient: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly config: CarriersConfig,
    private readonly logger: Logger
  ) {
    this.httpClient = this.createHttpClient();
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 15000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000
    });
  }

  async trackShipment(trackingCode: string): Promise<CarriersResponse> {
    try {
      const response = await this.circuitBreaker.fire(trackingCode);
      
      this.logger.debug('Resposta da API Carriers recebida', {
        trackingCode,
        eventsCount: response.events?.length || 0
      });

      return response;

    } catch (error) {
      this.logger.error('Erro na consulta à API Carriers', {
        trackingCode,
        error: error.message,
        errorType: error.constructor.name
      });

      if (error.code === 'ETIMEDOUT') {
        throw new CarriersTimeoutError('Timeout na consulta à API Carriers');
      }

      if (error.response?.status === 404) {
        throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado na Carriers`);
      }

      if (error.response?.status === 429) {
        throw new RateLimitError('Rate limit atingido na API Carriers');
      }

      if (error.response?.status >= 500) {
        throw new CarriersServerError('Erro interno da API Carriers');
      }

      throw new CarriersApiError('Erro na comunicação com API Carriers', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async makeRequest(trackingCode: string): Promise<CarriersResponse> {
    const response = await this.httpClient.get(
      `/client/Carriers/Tracking/${trackingCode}`
    );

    // Validar estrutura da resposta
    this.validateResponse(response.data);

    return response.data;
  }

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json',
        'User-Agent': 'SmartEnvios-Tracking/1.0'
      }
    });

    // Request interceptor para logging
    client.interceptors.request.use(request => {
      this.logger.debug('Requisição para API Carriers', {
        url: request.url,
        method: request.method
      });
      return request;
    });

    // Response interceptor para tratamento de erros
    client.interceptors.response.use(
      response => response,
      error => {
        this.logger.warn('Erro na resposta da API Carriers', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  private validateResponse(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new CarriersApiError('Resposta inválida da API Carriers');
    }

    // Validação básica da estrutura
    if (data.events && !Array.isArray(data.events)) {
      throw new CarriersApiError('Campo events deve ser um array');
    }
  }
}
```

### 4. Sistema de Agendamento

#### 4.1 Scheduler Principal

```typescript
export class TrackingScheduler {
  private isRunning = false;
  private jobHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly updateTrackingUseCase: UpdateTrackingUseCase,
    private readonly trackingRepository: TrackingRepository,
    private readonly config: SchedulerConfig,
    private readonly logger: Logger
  ) {}

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Scheduler já está rodando');
      return;
    }

    this.isRunning = true;

    // Job principal: verificar códigos pendentes
    this.jobHandle = setInterval(async () => {
      try {
        await this.processPendingTrackingCodes();
      } catch (error) {
        this.logger.error('Erro no scheduler principal', {
          error: error.message
        });
      }
    }, this.config.interval);

    // Job de limpeza: diário às 2h
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldEvents();
      } catch (error) {
        this.logger.error('Erro no job de limpeza', {
          error: error.message
        });
      }
    });

    this.logger.info('Tracking scheduler iniciado', {
      interval: this.config.interval,
      batchSize: this.config.batchSize
    });
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.jobHandle) {
      clearInterval(this.jobHandle);
      this.jobHandle = null;
    }

    this.logger.info('Tracking scheduler parado');
  }

  private async processPendingTrackingCodes(): Promise<void> {
    const pendingCodes = await this.trackingRepository.findPendingCodes(
      this.config.batchSize
    );

    if (pendingCodes.length === 0) {
      this.logger.debug('Nenhum código pendente para verificação');
      return;
    }

    this.logger.info(`Processando ${pendingCodes.length} códigos de rastreamento`);

    // Agrupar por transportadora para otimizar rate limits
    const codesByCarrier = this.groupByCarrier(pendingCodes);

    for (const [carrier, codes] of codesByCarrier) {
      await this.processCarrierBatch(carrier, codes);
      
      // Pausa entre transportadoras
      if (codes.length > 0) {
        await this.sleep(1000);
      }
    }
  }

  private groupByCarrier(codes: TrackingCode[]): Map<string, TrackingCode[]> {
    const grouped = new Map<string, TrackingCode[]>();
    
    for (const code of codes) {
      const carrier = code.carrier;
      if (!grouped.has(carrier)) {
        grouped.set(carrier, []);
      }
      grouped.get(carrier)!.push(code);
    }
    
    return grouped;
  }

  private async processCarrierBatch(carrier: string, codes: TrackingCode[]): Promise<void> {
    const maxConcurrency = this.getMaxConcurrencyForCarrier(carrier);
    
    this.logger.debug(`Processando lote da ${carrier}`, {
      codesCount: codes.length,
      maxConcurrency
    });

    // Processar em lotes com limite de concorrência
    for (let i = 0; i < codes.length; i += maxConcurrency) {
      const batch = codes.slice(i, i + maxConcurrency);
      
      const results = await Promise.allSettled(
        batch.map(code => this.processTrackingCode(code))
      );

      // Log de resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.debug(`Lote processado`, {
        carrier,
        successful,
        failed,
        total: batch.length
      });

      // Pausa entre lotes
      if (i + maxConcurrency < codes.length) {
        await this.sleep(500);
      }
    }
  }

  private async processTrackingCode(trackingCode: TrackingCode): Promise<void> {
    try {
      await this.updateTrackingUseCase.execute(trackingCode.code);
      
      this.logger.debug('Código processado com sucesso', {
        code: trackingCode.code,
        carrier: trackingCode.carrier
      });

    } catch (error) {
      this.logger.error('Erro ao processar código', {
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        error: error.message,
        errorType: error.constructor.name
      });

      // Não re-throw para não parar o processamento do lote
    }
  }

  private getMaxConcurrencyForCarrier(carrier: string): number {
    const limits: Record<string, number> = {
      'Carriers': 5,   // 5 requests paralelos
      'Correios': 3,   // 3 requests paralelos
      'default': 2     // 2 requests paralelos para outros
    };

    return limits[carrier] || limits.default;
  }

  private async cleanupOldEvents(): Promise<void> {
    this.logger.info('Iniciando limpeza de eventos antigos');

    // Implementar limpeza de eventos antigos (>90 dias)
    // Esta seria uma operação de database específica
    
    this.logger.info('Limpeza de eventos concluída');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Entregáveis por Fase

### Dias 3-4: Domínio e Casos de Uso
- [ ] Entidades principais implementadas
- [ ] Value objects e domain services
- [ ] Repository interfaces
- [ ] Casos de uso principais (Add, Update, Get)
- [ ] Validações de negócio

### Dias 5-6: Integrações e Scheduler
- [ ] Cliente Carriers API com circuit breaker
- [ ] Mapeamento de eventos da API
- [ ] Sistema de agendamento
- [ ] Rate limiting e cache
- [ ] Event publishing/consuming

## Critérios de Aceitação

1. **Domínio implementado**: Entidades e regras de negócio funcionais
2. **API Carriers integrada**: Cliente resiliente com tratamento de erros
3. **Scheduler funcionando**: Verificações automáticas executando
4. **Eventos publicados**: Kafka events sendo enviados corretamente
5. **Performance adequada**: Rate limits respeitados
6. **Testes passando**: >80% cobertura das regras de negócio

## Próximos Passos

Após conclusão, seguir para PRD-003: APIs REST e Documentação.

---

**Responsável**: Desenvolvedor do Desafio  
**Última Atualização**: Janeiro 2025
