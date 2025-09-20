# PRD-007: API Gateway e Integração Final

## Visão Geral

**Objetivo**: Implementar API Gateway como ponto central de acesso aos microserviços, orquestrar a integração completa entre todos os componentes e finalizar o sistema SmartEnvios com testes end-to-end e deploy.

**Duração Estimada**: 8-10 dias úteis  
**Prioridade**: Alta  
**Dependências**: Todos os PRDs anteriores (001-006)

## Contexto de Negócio

O API Gateway é essencial para:
- Centralizar o acesso aos microserviços
- Implementar autenticação e autorização
- Gerenciar rate limiting e throttling
- Prover observabilidade centralizada
- Facilitar versionamento de APIs
- Simplificar integração para clientes
- Garantir consistência na comunicação

## Especificações Técnicas

### 1. Arquitetura do Gateway

#### 1.1 Estrutura do Projeto
```
api-gateway/
├── src/
│   ├── config/                  # Configurações
│   │   ├── routes.ts           # Definição de rotas
│   │   ├── middleware.ts       # Middlewares globais
│   │   └── services.ts         # Configuração de serviços
│   ├── middleware/             # Middlewares customizados
│   │   ├── auth.ts            # Autenticação/Autorização
│   │   ├── rate-limit.ts      # Rate limiting
│   │   ├── validation.ts      # Validação de requests
│   │   ├── logging.ts         # Logging estruturado
│   │   └── metrics.ts         # Coleta de métricas
│   ├── services/              # Clientes para microserviços
│   │   ├── quote-service.ts   # Cliente cotação
│   │   ├── tracking-service.ts # Cliente rastreamento
│   │   └── contract-service.ts # Cliente contratação
│   ├── utils/                 # Utilitários
│   │   ├── circuit-breaker.ts # Circuit breaker
│   │   ├── retry.ts          # Retry logic
│   │   └── load-balancer.ts  # Load balancing
│   ├── types/                 # TypeScript definitions
│   └── health/               # Health checks
├── tests/                    # Testes completos
├── docker/                   # Dockerfiles
└── docs/                     # Documentação
```

#### 1.2 Stack Tecnológica
- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: Express.js + express-gateway ou Kong
- **Proxy**: http-proxy-middleware
- **Authentication**: JWT + Redis sessions
- **Rate Limiting**: Redis-based rate limiter
- **Circuit Breaker**: opossum library
- **Load Balancing**: round-robin / weighted
- **Monitoring**: Prometheus + Jaeger

### 2. Configuração de Rotas

#### 2.1 Definição de Rotas
```typescript
// config/routes.ts
export interface Route {
  path: string;
  target: string;
  methods: string[];
  auth?: boolean;
  rateLimit?: RateLimitConfig;
  timeout?: number;
  retries?: number;
  circuitBreaker?: CircuitBreakerConfig;
}

export const routes: Route[] = [
  // Cotação de Fretes
  {
    path: '/api/v1/quotes/*',
    target: 'http://freight-quote-service:3001',
    methods: ['GET', 'POST'],
    auth: false, // Público para cotações
    rateLimit: {
      windowMs: 60000, // 1 minuto
      max: 100 // 100 requests por minuto
    },
    timeout: 10000, // 10 segundos
    retries: 3
  },
  
  // Rastreamento
  {
    path: '/api/v1/tracking/*',
    target: 'http://tracking-service:3002',
    methods: ['GET', 'POST'],
    auth: false, // Público para consultas
    rateLimit: {
      windowMs: 60000,
      max: 200 // Mais requests para rastreamento
    },
    timeout: 5000,
    retries: 2
  },
  
  // Contratação
  {
    path: '/api/v1/contracts/*',
    target: 'http://freight-contract-service:3003',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true, // Requer autenticação
    rateLimit: {
      windowMs: 60000,
      max: 50 // Limite menor para operações sensíveis
    },
    timeout: 15000, // Timeout maior para operações complexas
    retries: 2,
    circuitBreaker: {
      timeout: 20000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    }
  },
  
  // Webhooks (sem rate limit)
  {
    path: '/api/v1/webhooks/*',
    target: 'http://tracking-service:3002',
    methods: ['POST'],
    auth: false,
    timeout: 30000,
    retries: 0 // Não retry em webhooks
  },
  
  // Health checks
  {
    path: '/health/*',
    target: '', // Roteamento dinâmico
    methods: ['GET'],
    auth: false,
    rateLimit: {
      windowMs: 60000,
      max: 1000
    }
  }
];
```

#### 2.2 Roteador Principal
```typescript
// src/router.ts
export class GatewayRouter {
  private app: Express;
  private serviceRegistry: ServiceRegistry;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  constructor(
    app: Express,
    serviceRegistry: ServiceRegistry
  ) {
    this.app = app;
    this.serviceRegistry = serviceRegistry;
    this.circuitBreakers = new Map();
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    routes.forEach(route => {
      this.setupRoute(route);
    });
    
    // Fallback para rotas não encontradas
    this.app.use('*', this.handleNotFound);
  }
  
  private setupRoute(route: Route): void {
    const middlewares: RequestHandler[] = [];
    
    // Middleware de métricas
    middlewares.push(metricsMiddleware);
    
    // Middleware de logging
    middlewares.push(loggingMiddleware);
    
    // Rate limiting se configurado
    if (route.rateLimit) {
      middlewares.push(this.createRateLimiter(route.rateLimit));
    }
    
    // Autenticação se necessária
    if (route.auth) {
      middlewares.push(authMiddleware);
    }
    
    // Validação específica da rota
    middlewares.push(this.createValidator(route));
    
    // Circuit breaker se configurado
    if (route.circuitBreaker) {
      const circuitBreaker = this.createCircuitBreaker(route);
      this.circuitBreakers.set(route.path, circuitBreaker);
      middlewares.push(this.circuitBreakerMiddleware(circuitBreaker));
    }
    
    // Proxy para o microserviço
    middlewares.push(this.createProxy(route));
    
    // Registrar rota
    route.methods.forEach(method => {
      (this.app as any)[method.toLowerCase()](route.path, ...middlewares);
    });
  }
  
  private createProxy(route: Route): RequestHandler {
    return createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      timeout: route.timeout || 10000,
      retryDelay: 1000,
      retries: route.retries || 0,
      pathRewrite: (path, req) => {
        // Remover o prefixo do gateway se necessário
        return path.replace(/^\/api\/v1/, '');
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          error: err.message,
          url: req.url,
          method: req.method,
          target: route.target
        });
        
        res.status(502).json({
          success: false,
          error: 'Bad Gateway',
          message: 'Serviço temporariamente indisponível'
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        // Adicionar headers customizados
        proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || uuidv4());
        proxyReq.setHeader('X-Gateway-Version', process.env.GATEWAY_VERSION || '1.0.0');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Adicionar headers de resposta
        res.setHeader('X-Response-Time', Date.now() - req.startTime);
      }
    });
  }
}
```

### 3. Middlewares

#### 3.1 Middleware de Autenticação
```typescript
// middleware/auth.ts
export class AuthMiddleware {
  private jwtSecret: string;
  private redisClient: Redis;
  
  constructor(jwtSecret: string, redisClient: Redis) {
    this.jwtSecret = jwtSecret;
    this.redisClient = redisClient;
  }
  
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Token de acesso não fornecido'
        });
        return;
      }
      
      // Verificar se token está na blacklist
      const isBlacklisted = await this.redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Token inválido'
        });
        return;
      }
      
      // Verificar e decodificar JWT
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Buscar informações da sessão no Redis
      const sessionData = await this.redisClient.get(`session:${decoded.sessionId}`);
      if (!sessionData) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Sessão expirada'
        });
        return;
      }
      
      // Adicionar dados do usuário à requisição
      req.user = JSON.parse(sessionData);
      req.token = token;
      
      next();
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Token expirado'
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Token inválido'
        });
      } else {
        logger.error('Auth middleware error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Erro interno de autenticação'
        });
      }
    }
  };
  
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Também aceitar token via query parameter (para casos específicos)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }
    
    return null;
  }
}
```

#### 3.2 Rate Limiting
```typescript
// middleware/rate-limit.ts
export class RateLimitMiddleware {
  private redisClient: Redis;
  
  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }
  
  createLimiter(config: RateLimitConfig): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req, config);
        const current = await this.getCurrentCount(key, config.windowMs);
        
        if (current >= config.max) {
          const resetTime = await this.getResetTime(key);
          
          res.set({
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          });
          
          res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'Limite de requisições excedido',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          });
          return;
        }
        
        // Incrementar contador
        await this.incrementCounter(key, config.windowMs);
        
        // Adicionar headers informativos
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': (config.max - current - 1).toString(),
          'X-RateLimit-Reset': (Date.now() + config.windowMs).toString()
        });
        
        next();
        
      } catch (error) {
        logger.error('Rate limit middleware error', { error: error.message });
        // Em caso de erro no rate limiting, permitir a requisição
        next();
      }
    };
  }
  
  private generateKey(req: Request, config: RateLimitConfig): string {
    // Usar IP + User ID (se autenticado) para a chave
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    
    return `rate_limit:${ip}:${userId}:${Date.now()}`;
  }
  
  private async getCurrentCount(key: string, windowMs: number): Promise<number> {
    const pipeline = this.redisClient.pipeline();
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Sliding window log usando sorted sets
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    return results?.[1]?.[1] as number || 0;
  }
  
  private async incrementCounter(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    await this.redisClient.zadd(key, now, `${now}-${Math.random()}`);
    await this.redisClient.expire(key, Math.ceil(windowMs / 1000));
  }
}
```

#### 3.3 Circuit Breaker
```typescript
// utils/circuit-breaker.ts
export class CircuitBreakerMiddleware {
  private circuitBreaker: CircuitBreaker;
  
  constructor(config: CircuitBreakerConfig) {
    this.circuitBreaker = new CircuitBreaker(this.proxyRequest, {
      timeout: config.timeout,
      errorThresholdPercentage: config.errorThresholdPercentage,
      resetTimeout: config.resetTimeout,
      name: config.serviceName
    });
    
    this.setupEventHandlers();
  }
  
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    this.circuitBreaker.fire(req, res, next)
      .then(() => {
        // Sucesso - next() já foi chamado
      })
      .catch((error) => {
        if (error.code === 'EOPENBREAKER') {
          res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'Serviço temporariamente indisponível'
          });
        } else if (error.code === 'ETIMEDOUT') {
          res.status(504).json({
            success: false,
            error: 'Gateway Timeout',
            message: 'Timeout na comunicação com o serviço'
          });
        } else {
          res.status(502).json({
            success: false,
            error: 'Bad Gateway',
            message: 'Erro na comunicação com o serviço'
          });
        }
      });
  };
  
  private async proxyRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Esta função será substituída pelo proxy real
    return new Promise((resolve, reject) => {
      next();
      resolve();
    });
  }
  
  private setupEventHandlers(): void {
    this.circuitBreaker.on('open', () => {
      logger.warn('Circuit breaker opened', { 
        service: this.circuitBreaker.name 
      });
    });
    
    this.circuitBreaker.on('halfOpen', () => {
      logger.info('Circuit breaker half-open', { 
        service: this.circuitBreaker.name 
      });
    });
    
    this.circuitBreaker.on('close', () => {
      logger.info('Circuit breaker closed', { 
        service: this.circuitBreaker.name 
      });
    });
  }
}
```

### 4. Service Discovery

#### 4.1 Registry de Serviços
```typescript
// services/service-registry.ts
export class ServiceRegistry {
  private services: Map<string, ServiceInstance[]>;
  private healthChecker: HealthChecker;
  
  constructor(healthChecker: HealthChecker) {
    this.services = new Map();
    this.healthChecker = healthChecker;
    this.startHealthChecks();
  }
  
  registerService(name: string, instance: ServiceInstance): void {
    if (!this.services.has(name)) {
      this.services.set(name, []);
    }
    
    const instances = this.services.get(name)!;
    const existingIndex = instances.findIndex(i => i.id === instance.id);
    
    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }
    
    logger.info('Service registered', {
      serviceName: name,
      instanceId: instance.id,
      url: instance.url
    });
  }
  
  unregisterService(name: string, instanceId: string): void {
    const instances = this.services.get(name);
    if (!instances) return;
    
    const filteredInstances = instances.filter(i => i.id !== instanceId);
    this.services.set(name, filteredInstances);
    
    logger.info('Service unregistered', {
      serviceName: name,
      instanceId
    });
  }
  
  getHealthyInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      return null;
    }
    
    const healthyInstances = instances.filter(i => i.status === 'healthy');
    if (healthyInstances.length === 0) {
      return null;
    }
    
    // Simple round-robin load balancing
    return this.selectInstance(healthyInstances);
  }
  
  private selectInstance(instances: ServiceInstance[]): ServiceInstance {
    // Weighted round-robin based on response times
    const totalWeight = instances.reduce((sum, instance) => {
      return sum + (1 / (instance.avgResponseTime || 1));
    }, 0);
    
    let random = Math.random() * totalWeight;
    
    for (const instance of instances) {
      const weight = 1 / (instance.avgResponseTime || 1);
      if (random <= weight) {
        return instance;
      }
      random -= weight;
    }
    
    // Fallback to first instance
    return instances[0];
  }
  
  private async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      for (const [serviceName, instances] of this.services.entries()) {
        for (const instance of instances) {
          try {
            const health = await this.healthChecker.check(instance);
            instance.status = health.status;
            instance.lastCheck = new Date();
            
            if (health.responseTime) {
              instance.avgResponseTime = instance.avgResponseTime
                ? (instance.avgResponseTime + health.responseTime) / 2
                : health.responseTime;
            }
            
          } catch (error) {
            instance.status = 'unhealthy';
            instance.lastCheck = new Date();
            
            logger.warn('Health check failed', {
              serviceName,
              instanceId: instance.id,
              error: error.message
            });
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

interface ServiceInstance {
  id: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  avgResponseTime?: number;
  metadata?: any;
}
```

### 5. Monitoramento e Observabilidade

#### 5.1 Métricas do Gateway
```typescript
// middleware/metrics.ts
export class GatewayMetrics {
  private requestsTotal = new Counter({
    name: 'gateway_requests_total',
    help: 'Total number of requests through gateway',
    labelNames: ['method', 'route', 'service', 'status_code']
  });
  
  private requestDuration = new Histogram({
    name: 'gateway_request_duration_seconds',
    help: 'Duration of requests through gateway',
    labelNames: ['method', 'route', 'service'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
  });
  
  private circuitBreakerState = new Gauge({
    name: 'gateway_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service']
  });
  
  private rateLimitHits = new Counter({
    name: 'gateway_rate_limit_hits_total',
    help: 'Total rate limit hits',
    labelNames: ['route', 'user_type']
  });
  
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    req.startTime = startTime;
    
    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = (Date.now() - startTime) / 1000;
      const route = req.route?.path || req.path;
      const service = req.headers['x-target-service'] as string || 'unknown';
      
      gatewayMetrics.requestsTotal.inc({
        method: req.method,
        route,
        service,
        status_code: res.statusCode.toString()
      });
      
      gatewayMetrics.requestDuration.observe({
        method: req.method,
        route,
        service
      }, duration);
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
  
  recordCircuitBreakerState(service: string, state: 'open' | 'closed' | 'half-open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    this.circuitBreakerState.set({ service }, stateValue);
  }
  
  recordRateLimitHit(route: string, userType: string): void {
    this.rateLimitHits.inc({ route, user_type: userType });
  }
}
```

#### 5.2 Distributed Tracing
```typescript
// middleware/tracing.ts
export class TracingMiddleware {
  private tracer: Tracer;
  
  constructor(tracer: Tracer) {
    this.tracer = tracer;
  }
  
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const span = this.tracer.startSpan(`${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.headers['user-agent'] || '',
        'user.id': req.user?.id || 'anonymous'
      }
    });
    
    // Add trace context to request
    req.span = span;
    req.traceId = span.spanContext().traceId;
    
    // Add trace ID to response headers
    res.setHeader('X-Trace-ID', req.traceId);
    
    // Override res.end to finish span
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': res.get('content-length') || 0
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      }
      
      span.end();
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}
```

### 6. Integração Completa

#### 6.1 Fluxo End-to-End
```typescript
// integration/e2e-flow.ts
export class E2EIntegrationFlow {
  constructor(
    private quoteService: QuoteServiceClient,
    private contractService: ContractServiceClient,
    private trackingService: TrackingServiceClient
  ) {}
  
  async executeCompleteFlow(request: E2EFlowRequest): Promise<E2EFlowResponse> {
    const flow = new FlowExecution(request.flowId);
    
    try {
      // Step 1: Calculate Quote
      flow.step('quote_calculation');
      const quote = await this.quoteService.calculate({
        zip_code_start: request.zipCodeStart,
        zip_code_end: request.zipCodeEnd,
        volumes: request.volumes,
        amount: request.amount
      });
      
      if (!quote.services || quote.services.length === 0) {
        throw new FlowError('No services available for this route');
      }
      
      // Step 2: Create Contract
      flow.step('contract_creation');
      const selectedService = quote.services[0]; // Select best service
      const contract = await this.contractService.create({
        quote_service_id: selectedService.serviceId,
        customer_id: request.customerId,
        type: 'freight',
        freightContentStatement: request.contractData
      });
      
      // Step 3: Confirm Contract
      flow.step('contract_confirmation');
      const confirmedContract = await this.contractService.confirm(contract.id);
      
      // Step 4: Initialize Tracking
      flow.step('tracking_initialization');
      if (confirmedContract.trackingCode) {
        await this.trackingService.add({
          code: confirmedContract.trackingCode,
          carrier: 'Carriers',
          customerReference: confirmedContract.contractNumber
        });
      }
      
      // Step 5: Generate Response
      flow.step('response_generation');
      const response: E2EFlowResponse = {
        flowId: request.flowId,
        quote: {
          services: quote.services,
          selected: selectedService
        },
        contract: {
          id: confirmedContract.id,
          number: confirmedContract.contractNumber,
          status: confirmedContract.status,
          trackingCode: confirmedContract.trackingCode
        },
        tracking: {
          code: confirmedContract.trackingCode,
          status: 'initiated',
          url: `${process.env.FRONTEND_URL}/rastreamento/${confirmedContract.trackingCode}`
        },
        documents: confirmedContract.documents.map(doc => ({
          type: doc.type,
          url: doc.url
        }))
      };
      
      flow.complete();
      return response;
      
    } catch (error) {
      flow.fail(error);
      throw new E2EFlowError('Flow execution failed', error);
    }
  }
}
```

#### 6.2 Health Check Aggregado
```typescript
// health/aggregated-health.ts
export class AggregatedHealthCheck {
  constructor(
    private serviceRegistry: ServiceRegistry,
    private dependencies: ExternalDependency[]
  ) {}
  
  async checkOverallHealth(): Promise<OverallHealthResponse> {
    const checks = await Promise.allSettled([
      this.checkMicroservices(),
      this.checkExternalDependencies(),
      this.checkInfrastructure()
    ]);
    
    const microservicesHealth = checks[0];
    const dependenciesHealth = checks[1];
    const infrastructureHealth = checks[2];
    
    const isHealthy = checks.every(check => 
      check.status === 'fulfilled' && check.value.status === 'healthy'
    );
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks: {
        microservices: microservicesHealth.status === 'fulfilled' 
          ? microservicesHealth.value 
          : { status: 'unhealthy', error: microservicesHealth.reason },
        dependencies: dependenciesHealth.status === 'fulfilled'
          ? dependenciesHealth.value
          : { status: 'unhealthy', error: dependenciesHealth.reason },
        infrastructure: infrastructureHealth.status === 'fulfilled'
          ? infrastructureHealth.value
          : { status: 'unhealthy', error: infrastructureHealth.reason }
      },
      metadata: {
        version: process.env.GATEWAY_VERSION,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }
  
  private async checkMicroservices(): Promise<HealthStatus> {
    const services = ['quote-service', 'tracking-service', 'contract-service'];
    const results = await Promise.allSettled(
      services.map(service => this.serviceRegistry.getHealthyInstance(service))
    );
    
    const healthyServices = results.filter(r => 
      r.status === 'fulfilled' && r.value !== null
    ).length;
    
    return {
      status: healthyServices === services.length ? 'healthy' : 'unhealthy',
      details: {
        total: services.length,
        healthy: healthyServices,
        services: services.map(service => ({
          name: service,
          status: this.serviceRegistry.getHealthyInstance(service) ? 'healthy' : 'unhealthy'
        }))
      }
    };
  }
  
  private async checkExternalDependencies(): Promise<HealthStatus> {
    const results = await Promise.allSettled(
      this.dependencies.map(dep => dep.healthCheck())
    );
    
    const healthyDeps = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 'healthy'
    ).length;
    
    return {
      status: healthyDeps === this.dependencies.length ? 'healthy' : 'unhealthy',
      details: {
        total: this.dependencies.length,
        healthy: healthyDeps,
        dependencies: results.map((result, index) => ({
          name: this.dependencies[index].name,
          status: result.status === 'fulfilled' && result.value.status === 'healthy' 
            ? 'healthy' : 'unhealthy',
          lastCheck: new Date()
        }))
      }
    };
  }
}
```

### 7. Deploy e Docker

#### 7.1 Docker Compose Completo
```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GATEWAY_VERSION=1.0.0
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongodb:27017/smartenvios
    depends_on:
      - redis
      - mongodb
      - kafka
    networks:
      - smartenvios-network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # Quote Service
  freight-quote-service:
    build: ./backend/freight-quote-service
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/smartenvios
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
      - CARRIERS_API_TOKEN=${CARRIERS_API_TOKEN}
    depends_on:
      - mongodb
      - redis
      - kafka
    networks:
      - smartenvios-network
    deploy:
      replicas: 3

  # Tracking Service
  tracking-service:
    build: ./backend/tracking-service
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/smartenvios
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
      - CARRIERS_API_TOKEN=${CARRIERS_API_TOKEN}
    depends_on:
      - mongodb
      - redis
      - kafka
    networks:
      - smartenvios-network
    deploy:
      replicas: 2

  # Contract Service
  freight-contract-service:
    build: ./backend/freight-contract-service
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/smartenvios
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
      - CARRIERS_API_TOKEN=${CARRIERS_API_TOKEN}
    depends_on:
      - mongodb
      - redis
      - kafka
    networks:
      - smartenvios-network
    deploy:
      replicas: 2

  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=http://localhost:3000
    depends_on:
      - api-gateway
    networks:
      - smartenvios-network

  # Infrastructure
  mongodb:
    image: mongo:7.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - smartenvios-network

  redis:
    image: redis:7.2-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - smartenvios-network

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
    networks:
      - smartenvios-network

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - smartenvios-network

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - smartenvios-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - smartenvios-network

volumes:
  mongodb_data:
  redis_data:
  grafana_data:

networks:
  smartenvios-network:
    driver: bridge
```

### 8. Testes End-to-End

#### 8.1 Cenários de Teste
```typescript
// tests/e2e/complete-flow.test.ts
describe('SmartEnvios E2E Flow', () => {
  let gateway: TestGateway;
  let testData: TestDataBuilder;
  
  beforeAll(async () => {
    gateway = new TestGateway();
    testData = new TestDataBuilder();
    await gateway.start();
  });
  
  afterAll(async () => {
    await gateway.stop();
  });
  
  describe('Complete Freight Flow', () => {
    it('should complete full freight contracting flow', async () => {
      // 1. Calculate Quote
      const quoteRequest = testData.buildQuoteRequest({
        zipCodeStart: '13660-088',
        zipCodeEnd: '38280-000'
      });
      
      const quoteResponse = await gateway.post('/api/v1/quotes/calculate', quoteRequest);
      expect(quoteResponse.status).toBe(200);
      expect(quoteResponse.body.data.services).toHaveLength.greaterThan(0);
      
      // 2. Create Contract
      const contractRequest = testData.buildContractRequest({
        quoteServiceId: quoteResponse.body.data.services[0].serviceId
      });
      
      const contractResponse = await gateway.post('/api/v1/contracts', contractRequest);
      expect(contractResponse.status).toBe(201);
      expect(contractResponse.body.data.id).toBeDefined();
      
      // 3. Confirm Contract
      const confirmResponse = await gateway.post(
        `/api/v1/contracts/${contractResponse.body.data.id}/confirm`
      );
      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.data.status).toBe('confirmed');
      expect(confirmResponse.body.data.trackingCode).toBeDefined();
      
      // 4. Check Tracking
      const trackingCode = confirmResponse.body.data.trackingCode;
      const trackingResponse = await gateway.get(`/api/v1/tracking/${trackingCode}`);
      expect(trackingResponse.status).toBe(200);
      expect(trackingResponse.body.data.trackingCode).toBe(trackingCode);
      
      // 5. Verify Documents
      expect(confirmResponse.body.data.documents).toHaveLength.greaterThan(0);
      
      // 6. Check Integration with External API
      await waitFor(5000); // Wait for async processing
      
      const refreshResponse = await gateway.post(`/api/v1/tracking/${trackingCode}/refresh`);
      expect(refreshResponse.status).toBe(200);
    });
    
    it('should handle rate limiting correctly', async () => {
      const requests = Array(101).fill(null).map(() => 
        gateway.post('/api/v1/quotes/calculate', testData.buildQuoteRequest())
      );
      
      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
    
    it('should handle service failures gracefully', async () => {
      // Simulate service failure
      await gateway.stopService('freight-quote-service');
      
      const response = await gateway.post('/api/v1/quotes/calculate', 
        testData.buildQuoteRequest()
      );
      
      expect(response.status).toBe(503); // Service Unavailable
      expect(response.body.error).toBe('Service Unavailable');
      
      // Restart service and verify recovery
      await gateway.startService('freight-quote-service');
      await waitFor(2000);
      
      const recoveryResponse = await gateway.post('/api/v1/quotes/calculate',
        testData.buildQuoteRequest()
      );
      expect(recoveryResponse.status).toBe(200);
    });
  });
});
```

## Entregáveis

### Fase 1: Gateway Core (3 dias)
- [ ] Setup básico do gateway
- [ ] Roteamento para microserviços
- [ ] Middlewares essenciais
- [ ] Service discovery básico

### Fase 2: Segurança e Limites (2 dias)
- [ ] Autenticação JWT
- [ ] Rate limiting
- [ ] Circuit breaker
- [ ] Validações de entrada

### Fase 3: Observabilidade (2 dias)
- [ ] Métricas Prometheus
- [ ] Distributed tracing
- [ ] Logging estruturado
- [ ] Health checks agregados

### Fase 4: Integração e Deploy (3 dias)
- [ ] Testes end-to-end
- [ ] Docker compose completo
- [ ] Configuração de monitoramento
- [ ] Documentação final

## Critérios de Aceitação

1. **Funcionalidade**: Gateway roteia corretamente para todos os serviços
2. **Performance**: Latência adicional < 50ms
3. **Reliability**: Uptime > 99.9%
4. **Security**: Autenticação e autorização funcionando
5. **Monitoring**: Observabilidade completa implementada

## Métricas de Sucesso

- **Gateway Latency**: P95 < 100ms
- **Error Rate**: < 0.5%
- **Throughput**: 1000+ req/s
- **Circuit Breaker**: Recovery time < 30s

## Próximos Passos

Após conclusão:
1. Deploy em ambiente de produção
2. Monitoramento contínuo
3. Otimizações de performance
4. Evolução dos microserviços

---

**Responsável**: DevOps + Backend Team  
**Revisores**: Tech Lead, Arquiteto  
**Última Atualização**: Janeiro 2025
