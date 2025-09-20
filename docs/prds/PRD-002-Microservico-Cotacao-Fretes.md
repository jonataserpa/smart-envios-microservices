# PRD-002: Microserviço de Cotação de Fretes

## Visão Geral

**Objetivo**: Desenvolver o microserviço responsável por calcular cotações de frete, integrando com APIs externas de transportadoras e fornecendo respostas rápidas e precisas para o frontend.

**Duração Estimada**: 6-8 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-001 (Infraestrutura Base)

## Contexto de Negócio

O microserviço de cotação é o coração do sistema SmartEnvios, responsável por:
- Calcular preços de frete em tempo real
- Integrar com múltiplas transportadoras
- Cachear resultados para otimização
- Validar dados de entrada
- Fornecer múltiplas opções de envio

## Especificações Técnicas

### 1. Arquitetura do Serviço

#### 1.1 Estrutura do Projeto
```
freight-quote-service/
├── src/
│   ├── domain/               # Regras de negócio
│   │   ├── entities/         # Entidades do domínio
│   │   ├── repositories/     # Interfaces de repositório
│   │   └── services/         # Serviços de domínio
│   ├── infrastructure/       # Implementações técnicas
│   │   ├── database/         # MongoDB repositories
│   │   ├── cache/           # Redis implementation
│   │   ├── http/            # APIs externas
│   │   └── messaging/       # Kafka producers
│   ├── application/          # Casos de uso
│   │   ├── handlers/        # Command/Query handlers
│   │   ├── dtos/           # Data Transfer Objects
│   │   └── validators/     # Validações de entrada
│   ├── presentation/         # Camada de apresentação
│   │   ├── controllers/     # REST controllers
│   │   ├── middlewares/     # Middlewares personalizados
│   │   └── routes/         # Definição de rotas
│   └── shared/              # Utilitários compartilhados
├── tests/                   # Testes unitários e integração
├── docs/                    # Documentação específica
├── Dockerfile              # Container configuration
└── package.json            # Dependencies e scripts
```

#### 1.2 Stack Tecnológica
- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: Express.js com Helmet para segurança
- **Validação**: Joi ou Zod para validação de schemas
- **ORM/ODM**: Mongoose para MongoDB
- **Cache**: ioredis para Redis
- **HTTP Client**: Axios com retry e timeout
- **Logs**: Winston com formato estruturado
- **Testes**: Jest + Supertest
- **Documentação**: Swagger/OpenAPI

### 2. Modelo de Dados

#### 2.1 Entidades Principais

```typescript
// Quote Entity
interface Quote {
  id: string;
  requestId: string;
  zipCodeStart: string;
  zipCodeEnd: string;
  volumes: Volume[];
  totalAmount: number;
  services: QuoteService[];
  status: QuoteStatus;
  createdAt: Date;
  expiresAt: Date;
  metadata: QuoteMetadata;
}

// Volume Entity
interface Volume {
  quantity: number;
  weight: number; // kg
  height: number; // cm
  width: number;  // cm
  length: number; // cm
  price: number;  // valor declarado
}

// Quote Service (resultado da cotação)
interface QuoteService {
  serviceId: string;
  carrierName: string;
  serviceName: string;
  price: number;
  estimatedDays: number;
  additionalInfo?: string;
}

// Cache Key Structure
interface CacheKey {
  zipCodeStart: string;
  zipCodeEnd: string;
  volumesHash: string; // MD5 hash dos volumes
  ttl: number; // Time to live em segundos
}
```

#### 2.2 Schema MongoDB
```javascript
const QuoteSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  zipCodeStart: { type: String, required: true, index: true },
  zipCodeEnd: { type: String, required: true, index: true },
  volumes: [{
    quantity: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0.1 },
    height: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true, min: 1 },
    length: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, required: true },
  services: [{
    serviceId: String,
    carrierName: String,
    serviceName: String,
    price: Number,
    estimatedDays: Number,
    additionalInfo: String
  }],
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  }
}, {
  timestamps: true,
  collection: 'quotes'
});

// Índices para otimização
QuoteSchema.index({ zipCodeStart: 1, zipCodeEnd: 1 });
QuoteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL 24h
```

### 3. APIs e Endpoints

#### 3.1 Endpoint Principal de Cotação
```typescript
// POST /api/v1/quotes/calculate
interface CalculateQuoteRequest {
  token: string;
  zip_code_start: string;
  zip_code_end: string;
  volumes: VolumeRequest[];
  amount: number;
}

interface CalculateQuoteResponse {
  success: boolean;
  data: {
    requestId: string;
    services: QuoteServiceResponse[];
    estimatedTime: string;
    cacheHit: boolean;
  };
  errors?: string[];
  metadata: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}
```

#### 3.2 Endpoints de Suporte
```typescript
// GET /api/v1/quotes/:requestId
// Buscar cotação por ID

// GET /api/v1/quotes/history?zipStart=&zipEnd=&limit=10
// Histórico de cotações

// POST /api/v1/quotes/:requestId/refresh
// Atualizar cotação específica

// GET /api/v1/health
// Health check do serviço
```

### 4. Integração com API Externa

#### 4.1 Configuração da API Carriers
```typescript
class CarriersApiClient {
  private readonly baseUrl = 'https://staging.smartenvios.tec.br';
  private readonly token = process.env.CARRIERS_API_TOKEN;
  
  async calculateFreight(request: CarriersRequest): Promise<CarriersResponse> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.baseUrl}/quote/api/v2/quotes/calculate-freight`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      data: request,
      timeout: 10000, // 10s timeout
      retry: 3,
      retryDelay: (retryCount) => retryCount * 1000
    };
    
    return await this.httpClient.request(config);
  }
}
```

#### 4.2 Mapeamento de Dados
```typescript
class CarriersMapper {
  static toCarriersRequest(quote: Quote): CarriersRequest {
    return {
      token: process.env.CARRIERS_API_TOKEN!,
      zip_code_start: quote.zipCodeStart,
      zip_code_end: quote.zipCodeEnd,
      volumes: quote.volumes.map(v => ({
        quantity: v.quantity,
        length: v.length,
        height: v.height,
        weight: v.weight,
        width: v.width,
        price: v.price
      })),
      amount: quote.totalAmount
    };
  }
  
  static fromCarriersResponse(response: CarriersResponse): QuoteService[] {
    return response.data.services.map(service => ({
      serviceId: service.id,
      carrierName: service.carrier_name,
      serviceName: service.service_name,
      price: service.price,
      estimatedDays: service.estimated_days,
      additionalInfo: service.additional_info
    }));
  }
}
```

### 5. Sistema de Cache

#### 5.1 Estratégia de Cache
```typescript
class QuoteCacheService {
  private readonly redis: Redis;
  private readonly ttl = 3600; // 1 hora
  
  async getCachedQuote(cacheKey: string): Promise<QuoteService[] | null> {
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedQuote(
    cacheKey: string, 
    services: QuoteService[]
  ): Promise<void> {
    await this.redis.setex(
      cacheKey, 
      this.ttl, 
      JSON.stringify(services)
    );
  }
  
  generateCacheKey(quote: Quote): string {
    const volumesHash = this.hashVolumes(quote.volumes);
    return `quote:${quote.zipCodeStart}:${quote.zipCodeEnd}:${volumesHash}`;
  }
  
  private hashVolumes(volumes: Volume[]): string {
    const sortedVolumes = volumes.sort((a, b) => 
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
    return crypto
      .createHash('md5')
      .update(JSON.stringify(sortedVolumes))
      .digest('hex');
  }
}
```

### 6. Casos de Uso

#### 6.1 Calcular Cotação
```typescript
class CalculateQuoteUseCase {
  constructor(
    private quoteRepository: QuoteRepository,
    private carriersClient: CarriersApiClient,
    private cacheService: QuoteCacheService,
    private eventPublisher: EventPublisher
  ) {}
  
  async execute(request: CalculateQuoteRequest): Promise<CalculateQuoteResponse> {
    // 1. Validar entrada
    const validation = await this.validateRequest(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // 2. Criar entidade Quote
    const quote = Quote.create(request);
    
    // 3. Verificar cache
    const cacheKey = this.cacheService.generateCacheKey(quote);
    const cachedServices = await this.cacheService.getCachedQuote(cacheKey);
    
    if (cachedServices) {
      // Cache hit - retornar resultado cached
      return this.buildResponse(quote, cachedServices, true);
    }
    
    // 4. Cache miss - buscar da API externa
    try {
      const carriersResponse = await this.carriersClient.calculateFreight(
        CarriersMapper.toCarriersRequest(quote)
      );
      
      const services = CarriersMapper.fromCarriersResponse(carriersResponse);
      
      // 5. Salvar no cache
      await this.cacheService.setCachedQuote(cacheKey, services);
      
      // 6. Persistir no banco
      quote.completeWithServices(services);
      await this.quoteRepository.save(quote);
      
      // 7. Publicar evento
      await this.eventPublisher.publish(
        'quote.calculated',
        { quoteId: quote.id, services: services.length }
      );
      
      return this.buildResponse(quote, services, false);
      
    } catch (error) {
      // 8. Tratar erros
      quote.markAsFailed(error.message);
      await this.quoteRepository.save(quote);
      
      await this.eventPublisher.publish(
        'quote.failed',
        { quoteId: quote.id, error: error.message }
      );
      
      throw new QuoteCalculationError('Falha ao calcular cotação', error);
    }
  }
}
```

### 7. Validações e Regras de Negócio

#### 7.1 Validações de Entrada
```typescript
const calculateQuoteSchema = Joi.object({
  token: Joi.string().required(),
  zip_code_start: Joi.string()
    .pattern(/^\d{5}-?\d{3}$/)
    .required()
    .messages({
      'string.pattern.base': 'CEP de origem deve ter formato 12345-678'
    }),
  zip_code_end: Joi.string()
    .pattern(/^\d{5}-?\d{3}$/)
    .required()
    .messages({
      'string.pattern.base': 'CEP de destino deve ter formato 12345-678'
    }),
  volumes: Joi.array()
    .min(1)
    .max(10)
    .items(Joi.object({
      quantity: Joi.number().integer().min(1).max(100).required(),
      weight: Joi.number().min(0.1).max(1000).required(),
      height: Joi.number().min(1).max(200).required(),
      width: Joi.number().min(1).max(200).required(),
      length: Joi.number().min(1).max(200).required(),
      price: Joi.number().min(0).max(100000).required()
    }))
    .required(),
  amount: Joi.number().min(0).max(100000).required()
});
```

#### 7.2 Regras de Negócio
```typescript
class QuoteBusinessRules {
  static validateVolumeLimits(volumes: Volume[]): ValidationResult {
    const errors: string[] = [];
    
    // Peso total máximo: 1000kg
    const totalWeight = volumes.reduce((sum, v) => sum + (v.weight * v.quantity), 0);
    if (totalWeight > 1000) {
      errors.push('Peso total não pode exceder 1000kg');
    }
    
    // Volume individual máximo: 200x200x200cm
    volumes.forEach((volume, index) => {
      if (volume.height > 200 || volume.width > 200 || volume.length > 200) {
        errors.push(`Volume ${index + 1}: dimensões não podem exceder 200cm`);
      }
    });
    
    // CEPs válidos (exemplo: não entregar para certas regiões)
    const restrictedZipCodes = ['00000-000', '99999-999'];
    // ... implementar validações específicas
    
    return { isValid: errors.length === 0, errors };
  }
}
```

### 8. Monitoramento e Observabilidade

#### 8.1 Métricas
```typescript
// Prometheus metrics
const quotesTotal = new Counter({
  name: 'quotes_total',
  help: 'Total number of quote requests',
  labelNames: ['status', 'cache_hit']
});

const quotesDuration = new Histogram({
  name: 'quotes_duration_seconds',
  help: 'Quote calculation duration',
  labelNames: ['carrier', 'cache_hit'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage'
});
```

#### 8.2 Logs Estruturados
```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'freight-quote-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/quote-service.log' })
  ]
});

// Uso nos handlers
logger.info('Quote calculation started', {
  requestId: quote.id,
  zipCodeStart: quote.zipCodeStart,
  zipCodeEnd: quote.zipCodeEnd,
  volumesCount: quote.volumes.length
});
```

## Entregáveis

### Fase 1: Core Service (3 dias)
- [ ] Estrutura base do projeto
- [ ] Entidades e repositórios
- [ ] Endpoint principal de cotação
- [ ] Integração com API Carriers
- [ ] Validações básicas

### Fase 2: Otimizações (2 dias)
- [ ] Sistema de cache Redis
- [ ] Estratégias de retry
- [ ] Rate limiting
- [ ] Async processing

### Fase 3: Qualidade (2 dias)
- [ ] Testes unitários (80%+ cobertura)
- [ ] Testes de integração
- [ ] Documentação OpenAPI
- [ ] Logs estruturados

### Fase 4: Observabilidade (1 dia)
- [ ] Métricas Prometheus
- [ ] Health checks
- [ ] Error tracking
- [ ] Performance monitoring

## Critérios de Aceitação

1. **Funcionalidade**: Cotação completa em < 2 segundos
2. **Cache**: Hit rate > 70% em cenários típicos
3. **Reliability**: Uptime > 99.9%
4. **Performance**: Suportar 100 req/min
5. **Qualidade**: Cobertura de testes > 80%

## Métricas de Sucesso

- **Tempo de resposta**: P95 < 1.5s
- **Taxa de erro**: < 1%
- **Cache hit rate**: > 70%
- **Throughput**: 100+ cotações/minuto

## Próximos Passos

Após conclusão, seguir para PRD-003: Frontend - Tela de Cotação.

---

**Responsável**: Backend Team  
**Revisores**: Tech Lead, Product Owner  
**Última Atualização**: Janeiro 2025
