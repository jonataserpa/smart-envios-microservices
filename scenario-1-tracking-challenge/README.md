# 📦 Cenário 1: Desafio Técnico - Microserviço de Rastreamento

## 🎯 Objetivo Principal

**Automatizar o processo de rastreio de pedidos** utilizando a API da transportadora "Carriers" e garantir a integração com a arquitetura de microsserviços existente, melhorando a eficiência e reduzindo o trabalho manual.

> **💡 Contexto**: Este é um desafio técnico onde os outros microserviços (Cotação e Contratação) **já existem** na empresa. Seu objetivo é implementar especificamente o **Microserviço de Rastreamento**.

---

## 🏗️ Arquitetura Proposta

### **Componentes do Sistema**

```mermaid
C4Container
    title Arquitetura do Microserviço de Rastreamento
    
    Person(client, "Cliente", "Usuário que quer rastrear pedidos")
    Person(admin, "Admin", "Administrador do sistema")
    
    Container_Boundary(c1, "SmartEnvios - Tracking Microservice") {
        Container(api, "Tracking API", "Node.js + Express", "Endpoints para gerenciar códigos de rastreamento")
        Container(scheduler, "Tracking Scheduler", "Node.js + Cron", "Verifica periodicamente status dos códigos")
        Container(consumer, "Event Consumer", "Node.js + Kafka", "Processa eventos de novos códigos")
    }
    
    ContainerDb(mongo, "MongoDB", "NoSQL Database", "Armazena códigos e eventos de rastreamento")
    Container(kafka, "Apache Kafka", "Message Broker", "Comunicação assíncrona")
    Container(redis, "Redis", "Cache", "Cache de consultas e rate limiting")
    
    System_Ext(carriers, "Carriers API", "API externa da transportadora")
    System_Ext(existing_ms, "Microserviços Existentes", "Cotação e Contratação já implementados")
    
    Rel(client, api, "Consulta rastreamento", "HTTPS")
    Rel(admin, api, "Gerencia códigos", "HTTPS")
    Rel(api, mongo, "CRUD operations", "MongoDB Driver")
    Rel(api, redis, "Cache queries", "Redis Client")
    Rel(scheduler, carriers, "Consulta status", "HTTPS")
    Rel(scheduler, mongo, "Atualiza eventos", "MongoDB Driver")
    Rel(scheduler, kafka, "Publica eventos", "Kafka Producer")
    Rel(consumer, kafka, "Consome eventos", "Kafka Consumer")
    Rel(existing_ms, kafka, "Envia códigos", "Kafka Producer")
```

### **1. 🔧 Microserviço de Rastreio de Pedidos**

#### **Responsabilidades:**
- ✅ **Receber códigos** de rastreamento via Kafka ou API
- ✅ **Consultar periodicamente** a API da transportadora 
- ✅ **Detectar mudanças** de status automaticamente
- ✅ **Armazenar eventos** de rastreamento no MongoDB
- ✅ **Publicar atualizações** via Kafka para outros serviços
- ✅ **Otimizar intervalos** de verificação baseado no status

#### **Comunicação:**
- **🔄 Assíncrona (Kafka)**: Para receber novos códigos e publicar atualizações
- **🌐 Síncrona (HTTP)**: Para consultar API Carriers e servir dados aos clientes

### **2. 🗄️ Banco de Dados MongoDB**

#### **Justificativa:**
- **Flexibilidade**: Estrutura ideal para eventos de rastreamento
- **Performance**: Consultas rápidas por trackingCode (chave única)
- **Escalabilidade**: Gerencia grandes volumes de dados não estruturados

#### **Estrutura de Dados:**
```json
{
  "_id": "ObjectId",
  "trackingCode": "SM82886187440BM",
  "carrier": "Carriers", 
  "contractId": "12345", // Referência ao contrato existente
  "customerId": "customer_123",
  "status": "in_transit",
  "isActive": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "lastCheckedAt": "2025-01-22T15:30:00Z",
  "nextCheckAt": "2025-01-22T16:00:00Z",
  "events": [
    {
      "id": "evt_001",
      "timestamp": "2025-01-20T10:30:00Z",
      "status": "posted",
      "location": "São Paulo, SP",
      "description": "Objeto postado",
      "isDelivered": false
    },
    {
      "id": "evt_002", 
      "timestamp": "2025-01-21T14:00:00Z",
      "status": "in_transit",
      "location": "Rio de Janeiro, RJ", 
      "description": "Objeto em trânsito",
      "isDelivered": false
    },
    {
      "id": "evt_003",
      "timestamp": "2025-01-22T09:15:00Z", 
      "status": "delivered",
      "location": "Rio de Janeiro, RJ",
      "description": "Objeto entregue ao destinatário",
      "isDelivered": true
    }
  ],
  "metadata": {
    "checkInterval": 30, // minutos
    "errorCount": 0,
    "lastError": null,
    "totalChecks": 47
  }
}
```

### **3. ⏰ Scheduler Inteligente**

#### **Implementação:**
- **Local**: **Node.js + node-cron** para simplicidade
- **Produção**: **Quartz Scheduler** ou **AWS EventBridge**

#### **Estratégia de Verificação:**
```typescript
interface CheckStrategy {
  posted: number;        // 5 min - acabou de ser postado
  in_transit: number;    // 30 min - viajando normalmente  
  out_for_delivery: number; // 10 min - saindo para entrega
  delivered: number;     // 0 - para de verificar
  exception: number;     // 15 min - problema detectado
  unknown: number;       // 60 min - status desconhecido
}
```

### **4. 📡 Produtor de Eventos (Kafka)**

#### **Tópicos:**
- **`tracking.status.updated`** - Mudanças de status
- **`tracking.code.delivered`** - Entregas finalizadas  
- **`tracking.error.detected`** - Problemas identificados

#### **Exemplo de Evento:**
```json
{
  "eventType": "tracking.status.updated",
  "trackingCode": "SM82886187440BM",
  "previousStatus": "in_transit", 
  "currentStatus": "out_for_delivery",
  "timestamp": "2025-01-22T08:30:00Z",
  "location": "Rio de Janeiro, RJ",
  "customerId": "customer_123",
  "contractId": "12345"
}
```

### **5. 🎯 Consumidor de Eventos (Kafka)**

#### **Tópicos Consumidos:**
- **`contract.created`** - Novos contratos com códigos para rastrear
- **`quote.converted`** - Cotações que viraram contratos

---

## 🏗️ Padrões Arquiteturais

### **Princípios Fundamentais**
- **Domain Driven Design (DDD)**: Organização por domínio de rastreamento
- **Event-Driven Architecture**: Comunicação assíncrona via Kafka
- **API Gateway Pattern**: Ponto centralizado de acesso (simulado)
- **Circuit Breaker Pattern**: Resiliência na comunicação com Carriers API
- **Repository Pattern**: Abstração de persistência MongoDB
- **Command Query Responsibility Segregation (CQRS)**: Separação de operações
- **Saga Pattern**: Coordenação de transações distribuídas
- **Retry Pattern**: Recuperação automática de falhas temporárias

### **Benefícios da Aplicação dos Padrões**
1. **Isolamento de Falhas**: Circuit breaker evita cascata de erros
2. **Escalabilidade**: Event-driven permite processamento assíncrono
3. **Manutenibilidade**: DDD facilita evolução do domínio
4. **Testabilidade**: Repository pattern permite mock de dados
5. **Resiliência**: Retry pattern recupera falhas temporárias
6. **Performance**: CQRS otimiza operações de leitura/escrita

---

## 🔄 Fluxo da Solução

### **1. 📥 Recebimento de Código**
```mermaid
sequenceDiagram
    participant MS as Microserviços Existentes
    participant K as Kafka
    participant T as Tracking Service
    participant DB as MongoDB
    
    MS->>K: Publica "contract.created"
    K->>T: Consome evento
    T->>T: Extrai trackingCode
    T->>DB: Salva código para monitorar
    T->>T: Agenda primeira verificação
```

### **2. 🔍 Consulta Inicial**
```bash
curl --request GET \
  --url "http://api.carriers.com.br/client/Carriers/Tracking/SM82886187440BM" \
  --header "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

**Resposta Esperada:**
```json
{
  "success": true,
  "trackingCode": "SM82886187440BM",
  "events": [
    {
      "date": "2025-01-20 10:30:00",
      "status": "Objeto postado",
      "location": "São Paulo, SP"
    },
    {
      "date": "2025-01-21 14:00:00", 
      "status": "Objeto em trânsito",
      "location": "Rio de Janeiro, RJ"
    }
  ]
}
```

### **3. 💾 Armazenamento e Processamento**
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant C as Carriers API
    participant T as Tracking Service
    participant DB as MongoDB
    participant K as Kafka
    
    loop A cada intervalo configurado
        S->>T: Verifica códigos pendentes
        T->>DB: Busca códigos ativos
        T->>C: Consulta status na Carriers
        C->>T: Retorna eventos atualizados
        T->>T: Compara com eventos existentes
        alt Novos eventos detectados
            T->>DB: Salva novos eventos
            T->>K: Publica atualização
        end
        T->>T: Calcula próximo intervalo
        T->>DB: Atualiza nextCheckAt
    end
```

### **4. 📢 Notificação e Integração**
```mermaid
flowchart LR
    A[Tracking atualizado] --> B[Kafka Event]
    B --> C[Notification Service]
    B --> D[Dashboard Service] 
    B --> E[Contract Service]
    B --> F[Analytics Service]
    
    C --> G[📧 Email Cliente]
    C --> H[📱 SMS/WhatsApp]
    D --> I[📊 Dashboard Tempo Real]
    E --> J[📋 Atualiza Status Contrato]
    F --> K[📈 Métricas de Entrega]
```

---

## 🏛️ Arquitetura C4 - Diagramas do Sistema

### **C1 - Diagrama de Contexto**
*Visão geral do microserviço de rastreamento e suas interações externas*

```mermaid
C4Context
    title Contexto do Microserviço de Rastreamento
    
    Person(cliente, "Cliente", "Consulta status dos rastreamentos")
    Person(admin, "Administrador", "Monitora e gerencia rastreamentos")
    
    System(tracking, "Tracking Microservice", "Automatiza rastreamento de pedidos via API Carriers")
    
    System_Ext(carriers, "API Carriers", "Serviço externo da transportadora")
    System_Ext(existing_ms, "Microserviços Existentes", "Cotação e Contratação (já implementados)")
    System_Ext(notification, "Notification Service", "Envia alertas e notificações")
    System_Ext(analytics, "Analytics Service", "Coleta métricas de entrega")
    
    Rel(cliente, tracking, "Consulta rastreamentos", "HTTPS/REST")
    Rel(admin, tracking, "Monitora sistema", "HTTPS/Dashboard")
    Rel(tracking, carriers, "Busca atualizações", "HTTPS/REST")
    Rel(existing_ms, tracking, "Envia códigos", "Kafka Events")
    Rel(tracking, notification, "Publica mudanças", "Kafka Events")
    Rel(tracking, analytics, "Envia métricas", "Kafka Events")
```

### **C2 - Diagrama de Contêineres**
*Aplicações e dados que compõem o microserviço de rastreamento*

```mermaid
C4Container
    title Contêineres do Microserviço de Rastreamento
    
    Person(cliente, "Cliente")
    Person(admin, "Admin")
    
    Container_Boundary(c1, "Tracking Microservice") {
        Container(api, "Tracking API", "Node.js + Express", "REST API para operações de rastreamento")
        Container(scheduler, "Tracking Scheduler", "Node.js + Cron", "Jobs automáticos de verificação")
        Container(consumer, "Event Consumer", "Node.js + Kafka", "Processa eventos de novos códigos")
        Container(worker, "Background Workers", "Node.js + Bull", "Processamento em background")
    }
    
    ContainerDb(mongodb, "MongoDB", "NoSQL Database", "Armazena códigos e eventos")
    Container(redis, "Redis", "Cache + Queue", "Cache de consultas e filas de jobs")
    Container(kafka, "Apache Kafka", "Message Broker", "Eventos assíncronos")
    
    System_Ext(carriers, "Carriers API")
    System_Ext(existing, "Existing Services")
    
    Rel(cliente, api, "HTTP/REST")
    Rel(admin, api, "HTTP/REST")
    Rel(api, mongodb, "Read/Write")
    Rel(api, redis, "Cache ops")
    Rel(scheduler, mongodb, "Read tracking codes")
    Rel(scheduler, carriers, "HTTP/REST")
    Rel(scheduler, kafka, "Publish events")
    Rel(consumer, kafka, "Consume events")
    Rel(consumer, mongodb, "Store new codes")
    Rel(worker, redis, "Process jobs")
    Rel(existing, kafka, "Send events")
```

### **C3 - Diagrama de Componentes**
*Componentes internos do microserviço de rastreamento*

```mermaid
C4Component
    title Componentes do Tracking Microservice
    
    Container_Boundary(api, "Tracking API") {
        Component(controller, "Tracking Controller", "Express Router", "Endpoints REST para rastreamento")
        Component(middleware, "Auth Middleware", "Express Middleware", "Autenticação e validação")
        Component(validator, "Input Validator", "Zod Schemas", "Validação de entrada")
    }
    
    Container_Boundary(app, "Application Layer") {
        Component(addUseCase, "Add Tracking Use Case", "Command Handler", "Adiciona novos códigos")
        Component(updateUseCase, "Update Tracking Use Case", "Command Handler", "Atualiza status dos códigos")
        Component(queryUseCase, "Query Tracking Use Case", "Query Handler", "Consulta dados de rastreamento")
        Component(scheduler, "Tracking Scheduler", "Cron Jobs", "Agenda verificações automáticas")
    }
    
    Container_Boundary(domain, "Domain Layer") {
        Component(trackingCode, "TrackingCode", "Aggregate", "Entidade principal do rastreamento")
        Component(trackingEvent, "TrackingEvent", "Entity", "Eventos de rastreamento")
        Component(domainService, "Tracking Service", "Domain Service", "Regras de negócio complexas")
        Component(repository, "Repository Interface", "Interface", "Abstração de persistência")
    }
    
    Container_Boundary(infra, "Infrastructure Layer") {
        Component(mongoRepo, "Mongo Repository", "MongoDB Driver", "Implementação de persistência")
        Component(carriersClient, "Carriers Client", "HTTP Client", "Integração com API Carriers")
        Component(kafkaProducer, "Kafka Producer", "Kafka Client", "Publicação de eventos")
        Component(redisCache, "Redis Cache", "Redis Client", "Cache e rate limiting")
    }
    
    Rel(controller, addUseCase, "calls")
    Rel(controller, updateUseCase, "calls") 
    Rel(controller, queryUseCase, "calls")
    Rel(addUseCase, trackingCode, "creates")
    Rel(updateUseCase, domainService, "uses")
    Rel(queryUseCase, repository, "queries")
    Rel(scheduler, updateUseCase, "triggers")
    Rel(domainService, repository, "uses")
    Rel(repository, mongoRepo, "implemented by")
    Rel(updateUseCase, carriersClient, "calls")
    Rel(updateUseCase, kafkaProducer, "publishes")
    Rel(carriersClient, redisCache, "caches")
```

### **C4 - Diagrama de Código - Use Case de Rastreamento**
*Estrutura de classes do caso de uso principal*

```mermaid
classDiagram
    class TrackingController {
        +addTrackingCode(request: AddTrackingRequest): Promise~TrackingResponse~
        +getTracking(code: string): Promise~TrackingResponse~
        +refreshTracking(code: string): Promise~TrackingResponse~
        +listTracking(query: ListTrackingQuery): Promise~TrackingListResponse~
        -validateRequest(request: any): ValidationResult
        -handleError(error: Error): ErrorResponse
    }
    
    class UpdateTrackingUseCase {
        -trackingRepository: TrackingRepository
        -carriersClient: CarriersTrackingClient
        -eventPublisher: EventPublisher
        -cacheService: TrackingCacheService
        +execute(trackingCode: string): Promise~TrackingEvent[]~
        -processNewEvents(tracking: TrackingCode, events: TrackingEvent[]): Promise~TrackingEvent[]~
        -updateTrackingStatus(tracking: TrackingCode, events: TrackingEvent[]): Promise~void~
        -calculateNextCheck(tracking: TrackingCode, error?: Error): Date
    }
    
    class TrackingCode {
        +id: string
        +code: string
        +carrier: string
        +status: TrackingStatus
        +lastCheckedAt: Date
        +nextCheckAt: Date
        +isActive: boolean
        +create(data: CreateTrackingData): TrackingCode
        +markAsDelivered(): void
        +updateNextCheck(interval: number): void
        +isExpired(): boolean
    }
    
    class TrackingEvent {
        +id: string
        +trackingCodeId: string
        +timestamp: Date
        +status: string
        +location: string
        +description: string
        +isDelivered: boolean
        +isException: boolean
        +create(data: EventData): TrackingEvent
    }
    
    class CarriersTrackingClient {
        -baseUrl: string
        -token: string
        -httpClient: AxiosInstance
        +trackShipment(trackingCode: string): Promise~CarriersTrackingResponse~
        +healthCheck(): Promise~HealthStatus~
        -buildRequest(code: string): AxiosRequestConfig
        -handleApiError(error: AxiosError): CarriersApiError
    }
    
    class TrackingRepository {
        <<interface>>
        +findByCode(code: string): Promise~TrackingCode | null~
        +save(tracking: TrackingCode): Promise~TrackingCode~
        +findPendingCodes(): Promise~TrackingCode[]~
        +findByCustomer(customerId: string): Promise~TrackingCode[]~
    }
    
    class MongoTrackingRepository {
        -model: TrackingCodeModel
        +findByCode(code: string): Promise~TrackingCode | null~
        +save(tracking: TrackingCode): Promise~TrackingCode~
        +findPendingCodes(): Promise~TrackingCode[]~
        +findByCustomer(customerId: string): Promise~TrackingCode[]~
        -mapToDomain(doc: Document): TrackingCode
        -mapToDocument(entity: TrackingCode): Document
    }
    
    class KafkaEventPublisher {
        -producer: Producer
        -logger: Logger
        +publish(eventType: string, data: any): Promise~void~
        -getTopicForEvent(eventType: string): string
        -createEvent(type: string, data: any): DomainEvent
    }
    
    class TrackingScheduler {
        -trackingService: TrackingService
        -isRunning: boolean
        +start(): void
        +stop(): void
        -processPendingTrackingCodes(): Promise~void~
        -processTrackingCode(code: TrackingCode): Promise~void~
        -cleanupOldEvents(): Promise~void~
    }

    TrackingController --> UpdateTrackingUseCase
    UpdateTrackingUseCase --> TrackingRepository
    UpdateTrackingUseCase --> CarriersTrackingClient
    UpdateTrackingUseCase --> KafkaEventPublisher
    UpdateTrackingUseCase --> TrackingCode
    UpdateTrackingUseCase --> TrackingEvent
    TrackingRepository <|-- MongoTrackingRepository
    TrackingScheduler --> UpdateTrackingUseCase
    MongoTrackingRepository --> TrackingCode
    KafkaEventPublisher --> TrackingEvent
```

### **🔄 Fluxo de Dados - Event-Driven Architecture**
*Como os eventos fluem pelo sistema de rastreamento*

```mermaid
sequenceDiagram
    participant MS as Microserviços Existentes
    participant K as Kafka
    participant TC as Tracking Consumer
    participant TS as Tracking Scheduler
    participant CA as Carriers API
    participant DB as MongoDB
    participant KP as Kafka Producer
    participant NS as Notification Service
    
    Note over MS, NS: 1. Adição de Novo Código
    MS->>K: Publica "contract.created"
    K->>TC: Consome evento
    TC->>DB: Salva código para monitorar
    TC->>DB: Agenda primeira verificação
    
    Note over MS, NS: 2. Verificação Automática
    loop A cada intervalo
        TS->>DB: Busca códigos pendentes
        TS->>CA: Consulta status atual
        CA-->>TS: Retorna eventos
        TS->>DB: Compara e salva novos eventos
        
        alt Novos eventos detectados
            TS->>KP: Publica "tracking.status.updated"
            KP->>K: Envia evento
            K->>NS: Notifica interessados
        end
        
        TS->>DB: Atualiza nextCheckAt
    end
    
    Note over MS, NS: 3. Consulta Manual
    MS->>TS: GET /api/v1/tracking/{code}
    TS->>DB: Busca eventos atuais
    DB-->>TS: Retorna dados
    TS-->>MS: Resposta com eventos
    
    Note over MS, NS: 4. Finalização
    TS->>DB: Detecta entrega
    TS->>KP: Publica "tracking.delivered"
    TS->>DB: Marca como inativo
```

---

## 📋 **Principais Operações da API - Guia Detalhado**

### **🔄 Ordem de Execução Típica**

```mermaid
graph TD
    A[1. Health Check] --> B[2. Adicionar Código]
    B --> C[3. Consultar Status]
    C --> D{Precisa Atualizar?}
    D -->|Sim| E[4. Forçar Refresh]
    D -->|Não| F[5. Monitorar via Scheduler]
    E --> F
    F --> G[6. Listar Códigos]
    G --> H[7. Métricas/Monitoring]
    
    style A fill:#e1f5fe
    style B fill:#c8e6c9
    style C fill:#fff3e0
    style E fill:#ffcdd2
    style F fill:#f3e5f5
    style G fill:#e8f5e8
    style H fill:#fce4ec
```

---

### **🟢 1. Health Check - Verificação de Saúde**

```http
GET /api/v1/health
```

**📝 Contexto:**
- **Primeira operação** a ser executada
- Verifica se o serviço está funcionando
- Testa conectividade com dependências externas
- Usado por load balancers e monitoring

**🔧 Request:**
```bash
curl -X GET http://localhost:3000/api/v1/health
```

**📤 Response (Saudável):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "mongodb": {
      "status": "connected",
      "responseTime": "12ms"
    },
    "redis": {
      "status": "connected", 
      "responseTime": "3ms"
    },
    "kafka": {
      "status": "connected",
      "responseTime": "8ms"
    },
    "carriersApi": {
      "status": "available",
      "responseTime": "145ms"
    }
  },
  "metrics": {
    "activeTrackingCodes": 1250,
    "processedToday": 3420,
    "errorRate": "0.2%",
    "avgResponseTime": "89ms"
  }
}
```

**⚠️ Response (Não Saudável):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "errors": [
    {
      "service": "carriersApi",
      "status": "unavailable",
      "error": "Connection timeout",
      "impact": "high"
    }
  ]
}
```

---

### **➕ 2. Adicionar Código de Rastreamento**

```http
POST /api/v1/tracking
```

**📝 Contexto:**
- **Primeira operação funcional** após health check
- Inicia o monitoramento de um novo código
- Faz consulta inicial à API Carriers
- Agenda próximas verificações automáticas

**🔧 Request:**
```bash
curl -X POST http://localhost:3000/api/v1/tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "trackingCode": "SM82886187440BM",
    "carrier": "Carriers",
    "customerId": "customer_123",
    "description": "Encomenda para João Silva",
    "metadata": {
      "orderId": "ORD-001",
      "priority": "normal"
    }
  }'
```

**📤 Response (Sucesso):**
```json
{
  "success": true,
  "data": {
    "id": "tracking_64f1a2b3c4d5e6f7g8h9i0j1",
    "trackingCode": "SM82886187440BM",
    "carrier": "Carriers",
    "status": "active",
    "customerId": "customer_123",
    "createdAt": "2025-01-22T10:35:00.000Z",
    "lastCheckedAt": "2025-01-22T10:35:00.000Z",
    "nextCheckAt": "2025-01-22T10:40:00.000Z",
    "events": [
      {
        "id": "event_1",
        "timestamp": "2025-01-20T10:30:00.000Z",
        "status": "Postado",
        "location": "São Paulo, SP",
        "description": "Objeto postado",
        "isDelivered": false
      }
    ],
    "summary": {
      "totalEvents": 1,
      "currentStatus": "Postado",
      "isDelivered": false,
      "estimatedDelivery": null
    }
  },
  "message": "Código de rastreamento adicionado com sucesso"
}
```

**❌ Response (Erro):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRACKING_CODE",
    "message": "Código de rastreamento inválido ou não encontrado",
    "details": {
      "trackingCode": "SM82886187440BM",
      "carrier": "Carriers",
      "carrierResponse": "Tracking code not found"
    }
  }
}
```

---

### **🔍 3. Consultar Código Específico**

```http
GET /api/v1/tracking/{code}
```

**📝 Contexto:**
- **Operação mais frequente** após adicionar código
- Retorna status atual sem forçar atualização
- Dados podem vir do cache (Redis) para performance
- Usado para consultas em tempo real

**🔧 Request:**
```bash
curl -X GET http://localhost:3000/api/v1/tracking/SM82886187440BM \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**📤 Response (Encontrado):**
```json
{
  "success": true,
  "data": {
    "id": "tracking_64f1a2b3c4d5e6f7g8h9i0j1",
    "trackingCode": "SM82886187440BM",
    "carrier": "Carriers",
    "status": "active",
    "customerId": "customer_123",
    "createdAt": "2025-01-22T10:35:00.000Z",
    "lastCheckedAt": "2025-01-22T11:35:00.000Z",
    "nextCheckAt": "2025-01-22T12:05:00.000Z",
    "events": [
      {
        "id": "event_1",
        "timestamp": "2025-01-20T10:30:00.000Z",
        "status": "Postado",
        "location": "São Paulo, SP",
        "description": "Objeto postado",
        "isDelivered": false
      },
      {
        "id": "event_2",
        "timestamp": "2025-01-21T14:20:00.000Z",
        "status": "Em trânsito",
        "location": "Campinas, SP",
        "description": "Objeto em trânsito",
        "isDelivered": false
      },
      {
        "id": "event_3",
        "timestamp": "2025-01-22T09:15:00.000Z",
        "status": "Saiu para entrega",
        "location": "Rio de Janeiro, RJ",
        "description": "Objeto saiu para entrega",
        "isDelivered": false
      }
    ],
    "summary": {
      "totalEvents": 3,
      "currentStatus": "Saiu para entrega",
      "isDelivered": false,
      "estimatedDelivery": "2025-01-22T18:00:00.000Z",
      "daysSincePosted": 2,
      "timeline": {
        "posted": "2025-01-20T10:30:00.000Z",
        "inTransit": "2025-01-21T14:20:00.000Z",
        "outForDelivery": "2025-01-22T09:15:00.000Z",
        "delivered": null
      }
    },
    "metadata": {
      "orderId": "ORD-001",
      "priority": "normal",
      "lastUpdateSource": "scheduler",
      "cacheHit": true
    }
  }
}
```

**❌ Response (Não Encontrado):**
```json
{
  "success": false,
  "error": {
    "code": "TRACKING_NOT_FOUND",
    "message": "Código de rastreamento não encontrado",
    "details": {
      "trackingCode": "SM82886187440BM"
    }
  }
}
```

---

### **🔄 4. Forçar Atualização (Refresh)**

```http
POST /api/v1/tracking/{code}/refresh
```

**📝 Contexto:**
- **Operação sob demanda** quando precisa de dados em tempo real
- Ignora cache e consulta diretamente a API Carriers
- Atualiza eventos e reagenda próxima verificação
- Usado quando cliente solicita status mais recente

**🔧 Request:**
```bash
curl -X POST http://localhost:3000/api/v1/tracking/SM82886187440BM/refresh \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "force": true,
    "reason": "customer_request"
  }'
```

**📤 Response (Sucesso - Novos Eventos):**
```json
{
  "success": true,
  "data": {
    "trackingCode": "SM82886187440BM",
    "refreshedAt": "2025-01-22T11:45:00.000Z",
    "changes": {
      "hasNewEvents": true,
      "newEventsCount": 1,
      "statusChanged": true,
      "previousStatus": "Saiu para entrega",
      "currentStatus": "Entregue"
    },
    "events": [
      {
        "id": "event_4",
        "timestamp": "2025-01-22T11:30:00.000Z",
        "status": "Entregue",
        "location": "Rio de Janeiro, RJ",
        "description": "Objeto entregue ao destinatário",
        "isDelivered": true,
        "recipient": "João Silva"
      }
    ],
    "summary": {
      "totalEvents": 4,
      "currentStatus": "Entregue",
      "isDelivered": true,
      "deliveredAt": "2025-01-22T11:30:00.000Z",
      "deliveryTime": {
        "days": 2,
        "hours": 1,
        "totalMinutes": 2940
      }
    },
    "nextAction": {
      "schedulerStatus": "deactivated",
      "reason": "Package delivered",
      "finalCheck": "2025-01-23T11:45:00.000Z"
    }
  },
  "message": "Rastreamento atualizado com sucesso - Pacote entregue!"
}
```

**📤 Response (Sucesso - Sem Mudanças):**
```json
{
  "success": true,
  "data": {
    "trackingCode": "SM82886187440BM", 
    "refreshedAt": "2025-01-22T11:45:00.000Z",
    "changes": {
      "hasNewEvents": false,
      "newEventsCount": 0,
      "statusChanged": false,
      "currentStatus": "Saiu para entrega"
    },
    "nextCheckAt": "2025-01-22T12:15:00.000Z"
  },
  "message": "Nenhuma atualização encontrada"
}
```

---

### **📋 5. Listar Códigos com Filtros**

```http
GET /api/v1/tracking
```

**📝 Contexto:**
- **Operação de overview** para dashboards e relatórios
- Permite filtros avançados e paginação
- Retorna resumo de múltiplos rastreamentos
- Usado para monitoramento em massa

**🔧 Request (Filtros Básicos):**
```bash
curl -X GET "http://localhost:3000/api/v1/tracking?customerId=customer_123&status=active&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**🔧 Request (Filtros Avançados):**
```bash
curl -X GET "http://localhost:3000/api/v1/tracking?carrier=Carriers&isDelivered=false&createdAt[gte]=2025-01-20&sort=-createdAt" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "tracking_64f1a2b3c4d5e6f7g8h9i0j1",
        "trackingCode": "SM82886187440BM",
        "carrier": "Carriers",
        "customerId": "customer_123",
        "status": "active",
        "currentStatus": "Saiu para entrega",
        "isDelivered": false,
        "createdAt": "2025-01-22T10:35:00.000Z",
        "lastEventAt": "2025-01-22T09:15:00.000Z",
        "eventsCount": 3,
        "daysSincePosted": 2
      },
      {
        "id": "tracking_74g2b3c4d5e6f7g8h9i0j1k2",
        "trackingCode": "SM82886187441BM",
        "carrier": "Carriers",
        "customerId": "customer_123",
        "status": "completed",
        "currentStatus": "Entregue",
        "isDelivered": true,
        "createdAt": "2025-01-21T15:20:00.000Z",
        "deliveredAt": "2025-01-22T10:45:00.000Z",
        "eventsCount": 5,
        "deliveryTime": {
          "days": 0,
          "hours": 19,
          "totalMinutes": 1145
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 48,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "applied": {
        "customerId": "customer_123",
        "status": "active"
      },
      "available": {
        "status": ["active", "completed", "inactive"],
        "carrier": ["Carriers", "Correios", "Jadlog"],
        "isDelivered": [true, false]
      }
    },
    "summary": {
      "totalActive": 23,
      "totalCompleted": 25,
      "averageDeliveryTime": "1.5 days",
      "successRate": "97.9%"
    }
  }
}
```

---

### **⚡ 6. Métricas Prometheus**

```http
GET /metrics
```

**📝 Contexto:**
- **Operação de monitoramento** para observabilidade
- Expõe métricas no formato Prometheus
- Usado por sistemas de alertas e dashboards
- Não requer autenticação (endpoint público)

**🔧 Request:**
```bash
curl -X GET http://localhost:3000/metrics
```

**📤 Response (Formato Prometheus):**
```prometheus
# HELP tracking_codes_total Total number of tracking codes
# TYPE tracking_codes_total counter
tracking_codes_total{status="active"} 1250
tracking_codes_total{status="completed"} 3420
tracking_codes_total{status="inactive"} 89

# HELP tracking_events_processed_total Total number of events processed
# TYPE tracking_events_processed_total counter
tracking_events_processed_total{carrier="Carriers"} 15670
tracking_events_processed_total{carrier="Correios"} 8230

# HELP tracking_api_requests_duration_seconds Duration of API requests
# TYPE tracking_api_requests_duration_seconds histogram
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="0.1"} 1250
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="0.5"} 2100
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="1.0"} 2300
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="+Inf"} 2350

# HELP tracking_scheduler_runs_total Number of scheduler executions
# TYPE tracking_scheduler_runs_total counter
tracking_scheduler_runs_total{status="success"} 1440
tracking_scheduler_runs_total{status="error"} 12

# HELP tracking_carrier_api_errors_total Errors from carrier API
# TYPE tracking_carrier_api_errors_total counter
tracking_carrier_api_errors_total{carrier="Carriers",error_type="timeout"} 5
tracking_carrier_api_errors_total{carrier="Carriers",error_type="not_found"} 12
tracking_carrier_api_errors_total{carrier="Carriers",error_type="rate_limit"} 3

# HELP tracking_delivery_time_seconds Time from post to delivery
# TYPE tracking_delivery_time_seconds histogram
tracking_delivery_time_seconds_bucket{carrier="Carriers",le="86400"} 120
tracking_delivery_time_seconds_bucket{carrier="Carriers",le="172800"} 890
tracking_delivery_time_seconds_bucket{carrier="Carriers",le="259200"} 1250
```

---

## 🔄 **Fluxo Completo de Uso**

### **📋 Cenário Típico:**

```mermaid
sequenceDiagram
    participant Client as Cliente/Frontend
    participant API as Tracking API
    participant DB as MongoDB
    participant Carrier as Carriers API
    participant Kafka as Kafka Broker
    participant Scheduler as Background Scheduler

    Note over Client,Scheduler: 🚀 Fluxo Completo de Rastreamento

    %% 1. Health Check
    Client->>API: GET /health
    API-->>Client: ✅ Sistema saudável

    %% 2. Adicionar código
    Client->>API: POST /tracking (SM123...)
    API->>Carrier: GET /Tracking/SM123...
    Carrier-->>API: Eventos iniciais
    API->>DB: Salvar código + eventos
    API->>Kafka: Publish: tracking.added
    API-->>Client: ✅ Código adicionado

    %% 3. Monitoramento automático
    Note over Scheduler: ⏰ A cada 1 minuto
    Scheduler->>DB: Buscar códigos pendentes
    DB-->>Scheduler: Lista de códigos
    Scheduler->>Carrier: Verificar atualizações
    Carrier-->>Scheduler: Novos eventos
    Scheduler->>DB: Salvar novos eventos
    Scheduler->>Kafka: Publish: tracking.updated

    %% 4. Cliente consulta
    Client->>API: GET /tracking/SM123...
    API->>DB: Buscar dados (cache Redis)
    DB-->>API: Eventos atualizados
    API-->>Client: ✅ Status atual

    %% 5. Refresh manual
    Client->>API: POST /tracking/SM123.../refresh
    API->>Carrier: Forçar consulta
    Carrier-->>API: Status em tempo real
    API->>DB: Atualizar se necessário
    API->>Kafka: Publish se mudanças
    API-->>Client: ✅ Dados atualizados

    %% 6. Listagem
    Client->>API: GET /tracking?filters...
    API->>DB: Query com filtros
    DB-->>API: Lista paginada
    API-->>Client: ✅ Lista de rastreamentos

    %% 7. Monitoramento
    Note over Client: 📊 Sistemas de monitoramento
    Client->>API: GET /metrics
    API-->>Client: ✅ Métricas Prometheus
```

---

## 💡 **Melhores Práticas de Uso**

### **🎯 Ordem Recomendada:**

1. **Sempre começar** com `GET /health` 
2. **Adicionar códigos** via `POST /tracking`
3. **Consultar status** via `GET /tracking/{code}`
4. **Refresh manual** apenas quando necessário
5. **Usar listagem** para dashboards
6. **Monitorar métricas** continuamente

### **⚠️ Limitações e Rate Limits:**

```json
{
  "rateLimits": {
    "global": "1000 req/min",
    "perEndpoint": {
      "POST /tracking": "100 req/min",
      "POST /tracking/{code}/refresh": "20 req/min",
      "GET /tracking/{code}": "500 req/min"
    },
    "perClient": "200 req/min"
  },
  "recommendations": {
    "refreshFrequency": "Máximo 1x por 5 minutos",
    "batchOperations": "Use listagem ao invés de múltiplas consultas",
    "cache": "GET operations são cached por 1 minuto"
  }
}
```

---

## 🔧 Tecnologias Utilizadas

### **Core Stack:**
- **Runtime**: Node.js 20+ LTS
- **Language**: TypeScript 5+
- **Framework**: Express.js 4+
- **Database**: MongoDB 7+
- **Cache**: Redis 7+
- **Message Broker**: Apache Kafka 3+

### **Bibliotecas Principais:**
- **HTTP Client**: Axios para Carriers API
- **Validation**: Zod para schemas
- **Logging**: Winston estruturado  
- **Scheduler**: node-cron
- **Testing**: Jest + Supertest
- **Monitoring**: Prometheus client

### **DevOps:**
- **Container**: Docker + Docker Compose
- **Process Management**: PM2
- **Environment**: dotenv
- **Linting**: ESLint + Prettier

---

## 📊 Argumentação das Escolhas

### **1. 🗄️ MongoDB (NoSQL)**
#### **✅ Vantagens:**
- **Flexibilidade**: Eventos podem ter estruturas diferentes
- **Performance**: Índices otimizados para trackingCode
- **Escalabilidade**: Sharding horizontal natural
- **Agregações**: Pipeline poderoso para relatórios

#### **📊 Alternativas Consideradas:**
- **PostgreSQL**: Mais complexo para eventos semi-estruturados
- **Elasticsearch**: Overkill para esta funcionalidade específica

### **2. 📡 Apache Kafka**
#### **✅ Vantagens:**
- **Integração**: Já usado pelos microserviços existentes
- **Durabilidade**: Eventos não se perdem
- **Escalabilidade**: Milhões de eventos por segundo
- **Ordem garantida**: Por partição

#### **📊 Alternativas Consideradas:**
- **RabbitMQ**: Menos performático para alto volume
- **Redis Pub/Sub**: Sem persistência

### **3. ⚡ Redis Cache**
#### **✅ Vantagens:**
- **Rate Limiting**: Evita sobrecarga da Carriers API
- **Cache de Consultas**: Responses frequentes
- **Session Storage**: Para dashboards
- **Distributed Locks**: Para scheduler

### **4. 🏗️ Arquitetura de Microserviços**
#### **✅ Vantagens:**
- **Separação de Responsabilidades**: Cada serviço tem função clara
- **Escalabilidade**: Escalar apenas rastreamento se necessário  
- **Manutenibilidade**: Times independentes
- **Tecnologia**: Stacks otimizadas por domínio

---

## ⏱️ Cronograma de Desenvolvimento

### **🎯 Detalhamento por Dia:**

#### **Dia 1: Setup e Infraestrutura** 
- [x] Criação do repositório estruturado
- [x] Docker Compose completo (MongoDB, Kafka, Redis)
- [x] Estrutura de pastas e arquivos base
- [x] Configuração de ambiente (.env)

#### **Dia 2: API Base**
- [ ] Express.js configurado com TypeScript
- [ ] Endpoints CRUD para códigos de rastreamento
- [ ] Validações com Zod
- [ ] Conexão MongoDB com Mongoose

#### **Dia 3: Integração Carriers**
- [ ] Cliente HTTP para Carriers API
- [ ] Mapeamento de responses
- [ ] Error handling e retry logic
- [ ] Cache Redis para rate limiting

#### **Dia 4: Scheduler e Jobs**
- [ ] Sistema de jobs com node-cron
- [ ] Lógica de intervalos inteligentes
- [ ] Kafka producer para eventos
- [ ] Consumer para novos códigos

#### **Dia 5: Testes e Monitoramento**
- [ ] Testes unitários (>80% coverage)
- [ ] Testes de integração com Carriers
- [ ] Health checks e métricas
- [ ] Logging estruturado

#### **Dia 6: Deploy e Documentação**
- [ ] Docker otimizado para produção
- [ ] OpenAPI/Swagger documentation
- [ ] README técnico completo
- [ ] Vídeo de demonstração

---

## 🧪 Critérios de Aceitação

### **✅ Funcionalidades Obrigatórias:**
1. **API REST** funcional com todos os endpoints
2. **Integração Carriers** com error handling robusto
3. **Scheduler** verificando códigos automaticamente
4. **Kafka** produzindo e consumindo eventos
5. **MongoDB** persistindo dados corretamente
6. **Health checks** reportando status do sistema

### **🎯 Critérios de Qualidade:**
- **Cobertura de testes** ≥ 80%
- **Response time API** ≤ 200ms (P95)
- **Error rate** ≤ 1%
- **Uptime** ≥ 99.9%
- **Documentação** completa e atualizada

### **📊 Métricas de Performance:**
- **Códigos processados**: 1000+ por hora
- **Latência Carriers API**: ≤ 2 segundos
- **Memory usage**: ≤ 512MB
- **CPU usage**: ≤ 50% (load normal)

---

## 🚀 Próximos Passos

### **1. 📋 Planejamento (Hoje)**
- [x] Estruturação do repositório ✅
- [x] Documentação da arquitetura ✅ 
- [ ] Refinamento dos requisitos

### **2. 🔧 Desenvolvimento (2-5 dias)**
- [ ] Implementação seguindo o cronograma
- [ ] Code reviews contínuos
- [ ] Testes em paralelo

### **3. 🎬 Entrega (Dia 6)**
- [ ] Demonstração funcional
- [ ] Vídeo explicativo
- [ ] Documentação final

---

## 📚 Recursos e Referências

### **🔗 Links Úteis:**
- **Carriers API**: [Documentação oficial](http://api.carriers.com.br)
- **MongoDB**: [Best practices](https://docs.mongodb.com/manual/best-practices/)
- **Apache Kafka**: [Node.js client](https://kafka.js.org/)
- **Express.js**: [TypeScript setup](https://expressjs.com/en/advanced/typescript.html)

### **📖 Documentação Técnica:**
- **API Specification**: `docs/api/openapi.yaml` (a ser criado)
- **Database Schema**: `docs/database/mongodb-schema.md` (a ser criado)
- **Event Schemas**: `docs/events/kafka-events.md` (a ser criado)

---

## 🎓 Entendendo a Arquitetura C4 - Guia Passo a Passo

### **📚 O Que é o Modelo C4?**

O modelo C4 é como um **mapa com diferentes níveis de zoom** da sua arquitetura de software. Imagine que você está explicando o sistema de rastreamento para pessoas diferentes:

- **🌍 C1 (Contexto)**: Vista de satélite - "O que o sistema faz no mundo?"
- **🏙️ C2 (Contêineres)**: Vista da cidade - "Quais aplicações compõem o sistema?"
- **🏭 C3 (Componentes)**: Vista dos bairros - "Como cada aplicação é organizada internamente?"
- **🔧 C4 (Código)**: Vista das ruas - "Como o código está estruturado?"

### **🔍 Detalhamento de Cada Nível**

#### **📊 C1 - Contexto: "A Vista Geral"**

**Para quem é**: Stakeholders, gerentes, product owners  
**Pergunta que responde**: "Como o microserviço de rastreamento se encaixa no ecossistema?"

**O que você vê**:
- ✅ O microserviço como uma "caixa preta"
- ✅ Outros sistemas que interagem com ele
- ✅ Usuários que o utilizam
- ✅ APIs externas que consome

**Como funciona no nosso caso**:
```mermaid
graph TB
    Cliente[👤 Cliente] --> Tracking[📦 Tracking Microservice]
    ExistingMS[🏢 Microserviços Existentes] --> Tracking
    Tracking --> Carriers[🚛 API Carriers]
    Tracking --> Notification[📧 Notification Service]
```

**Por que é importante**: Todos entendem o "quadro geral" sem se perder em detalhes técnicos.

---

#### **🏗️ C2 - Contêineres: "Os Bairros da Cidade"**

**Para quem é**: Arquitetos de software, tech leads  
**Pergunta que responde**: "Quais aplicações e bancos de dados compõem o microserviço?"

**O que você vê**:
- ✅ API REST (Node.js + Express)
- ✅ Scheduler automático (Node.js + Cron)
- ✅ Event Consumer (Kafka)
- ✅ MongoDB (banco de dados)
- ✅ Redis (cache)

**Como funciona no nosso caso**:
```mermaid
graph TB
    subgraph "Tracking Microservice"
        API[🌐 REST API]
        Scheduler[⏰ Scheduler]
        Consumer[📥 Event Consumer]
    end
    
    MongoDB[(🗄️ MongoDB)]
    Redis[(⚡ Redis)]
    Kafka[📡 Kafka]
    
    API --> MongoDB
    Scheduler --> MongoDB
    Consumer --> MongoDB
    API --> Redis
```

**Por que é importante**: Define os componentes que precisam ser deployados e como se comunicam.

---

#### **⚙️ C3 - Componentes: "Dentro de Cada Fábrica"**

**Para quem é**: Desenvolvedores experientes, líderes técnicos  
**Pergunta que responde**: "Como a API REST está organizada internamente?"

**O que você vê**:
- ✅ Controllers (recebem requests)
- ✅ Use Cases (lógica de negócio)
- ✅ Repositories (acesso a dados)
- ✅ Services (integrações externas)

**Como funciona no nosso caso**:
```mermaid
graph TB
    Controller[🎯 Tracking Controller] --> UseCase[⚡ Update Tracking Use Case]
    UseCase --> Repository[🗄️ Tracking Repository]
    UseCase --> Client[🌐 Carriers Client]
    UseCase --> Publisher[📡 Event Publisher]
```

**Por que é importante**: Desenvolvedores sabem onde implementar cada funcionalidade.

---

#### **💻 C4 - Código: "A Planta Baixa"**

**Para quem é**: Desenvolvedores implementando  
**Pergunta que responde**: "Quais classes e métodos preciso criar?"

**O que você vê**:
- ✅ Classes específicas (`TrackingController`, `UpdateTrackingUseCase`)
- ✅ Métodos públicos e privados
- ✅ Interfaces e implementações
- ✅ Relacionamentos entre classes

**Como funciona no nosso caso**:
```typescript
class TrackingController {
  +getTracking(code: string): Promise<TrackingResponse>
  +refreshTracking(code: string): Promise<TrackingResponse>
  
  constructor(
    private updateUseCase: UpdateTrackingUseCase
  ) {}
}
```

**Por que é importante**: Guia exato para implementação do código.

### **🔄 Fluxo de Trabalho Natural**

1. **💼 Reunião de Negócio**: Use C1 para alinhar expectativas
2. **🏗️ Design de Arquitetura**: Use C2 para definir deploy
3. **👨‍💻 Design de Código**: Use C3 para organizar desenvolvimento
4. **⌨️ Implementação**: Use C4 para escrever código

### **💡 Dicas Importantes**

#### **✅ Faça**:
- Mantenha **consistência** entre os níveis
- Use **linguagem simples** em cada nível
- **Atualize** diagramas quando o código mudar

#### **❌ Não Faça**:
- Misturar níveis diferentes no mesmo diagrama
- Mostrar detalhes de código no C1
- Criar diagramas que ninguém entende

### **🎯 Exemplo Prático de Uso**

**Situação**: Novo desenvolvedor entra na equipe

1. **Dia 1**: Mostrar C1 - "Entenda o que fazemos"
2. **Dia 2**: Mostrar C2 - "Veja como deployamos"  
3. **Semana 1**: Mostrar C3 - "Entenda a organização interna"
4. **Semana 2**: Mostrar C4 - "Aqui está o código que você vai mexer"

### **📈 Benefícios Concretos**

- **⚡ Onboarding mais rápido**: Novos devs entendem progressivamente
- **🗣️ Comunicação melhor**: Cada stakeholder vê o que precisa
- **🔧 Manutenção facilitada**: Mudanças são documentadas visualmente
- **📋 Documentação viva**: Diagramas evoluem com o código

---

## ⚡ Fluxo de Execução Detalhado

### **🔄 1. Ciclo de Vida Completo de um Código de Rastreamento**

#### **Fase 1: Recebimento (2-5 segundos)**
```mermaid
sequenceDiagram
    participant MS as Microserviço Existente
    participant K as Kafka
    participant TC as Tracking Consumer
    participant DB as MongoDB
    participant Cache as Redis
    
    MS->>K: Publica evento "contract.created"
    Note over K: Evento contém trackingCode: "SM123BR"
    K->>TC: Consumer recebe evento
    TC->>TC: Valida estrutura do evento
    TC->>Cache: Verifica duplicatas (5min TTL)
    
    alt Código não duplicado
        TC->>DB: Salva novo TrackingCode
        Note over DB: Status: "pending", nextCheckAt: agora + 5min
        TC->>Cache: Marca como processado
    else Código duplicado
        TC->>TC: Log warning e ignora
    end
```

#### **Fase 2: Primeira Verificação (30-60 segundos)**
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant DB as MongoDB
    participant CA as Carriers API
    participant Cache as Redis
    participant KP as Kafka Producer
    
    Note over S: Job roda a cada 1 minuto
    S->>DB: SELECT * FROM tracking WHERE nextCheckAt <= NOW()
    DB-->>S: Retorna códigos pendentes
    
    loop Para cada código
        S->>Cache: Verifica rate limit (100 req/min)
        
        alt Rate limit OK
            S->>CA: GET /Tracking/{code}
            CA-->>S: Retorna eventos da transportadora
            S->>S: Mapeia eventos para formato interno
            S->>DB: Compara com eventos existentes
            
            alt Novos eventos encontrados
                S->>DB: INSERT novos eventos
                S->>KP: Publica "tracking.status.updated"
                S->>DB: UPDATE nextCheckAt = agora + intervalo
            else Sem novos eventos
                S->>DB: UPDATE lastCheckedAt = agora
                S->>DB: UPDATE nextCheckAt = agora + intervalo
            end
        else Rate limit atingido
            S->>S: Agenda para próxima execução
        end
    end
```

#### **Fase 3: Monitoramento Contínuo (Horas/Dias)**
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant DB as MongoDB
    participant CA as Carriers API
    participant KP as Kafka Producer
    participant IS as Interval Strategy
    
    Note over S: Loop contínuo baseado em status
    
    loop Até entrega ou expiração
        S->>DB: Busca códigos ativos
        S->>IS: Calcula intervalo baseado no status
        Note over IS: posted: 5min, in_transit: 30min, out_for_delivery: 10min
        
        S->>CA: Verifica status atual
        
        alt Status mudou
            S->>DB: Atualiza status do código
            S->>KP: Publica mudança de status
            
            alt Status = "delivered"
                S->>DB: isActive = false
                S->>KP: Publica "tracking.delivered"
                Note over S: Para monitoramento
            else Status = "exception"
                S->>IS: Intervalo = 15 min (mais frequente)
                S->>KP: Publica "tracking.exception"
            end
        end
        
        S->>S: Sleep até próximo intervalo
    end
```

#### **Fase 4: Consultas da API (Tempo Real)**
```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as Tracking API
    participant Cache as Redis
    participant DB as MongoDB
    participant Validator as Input Validator
    
    C->>API: GET /api/v1/tracking/SM123BR
    API->>Validator: Valida formato do código
    
    alt Código válido
        API->>Cache: Busca resultado cacheado
        
        alt Cache hit
            Cache-->>API: Retorna dados cacheados
            API-->>C: Response com eventos
        else Cache miss
            API->>DB: Busca tracking + eventos
            DB-->>API: Retorna dados completos
            API->>Cache: Armazena no cache (5min TTL)
            API-->>C: Response com eventos
        end
    else Código inválido
        API-->>C: 400 Bad Request
    end
```

### **🎯 2. Fluxos de Erro e Recuperação**

#### **Recuperação de Falhas da API Carriers**
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant CA as Carriers API
    participant DB as MongoDB
    participant ES as Error Strategy
    
    S->>CA: Verifica tracking code
    CA-->>S: 429 Rate Limit / 500 Server Error
    
    S->>ES: Calcula backoff exponencial
    Note over ES: Retry 1: 1s, Retry 2: 2s, Retry 3: 4s
    
    loop Max 3 tentativas
        S->>S: Wait backoff time
        S->>CA: Retry request
        
        alt Sucesso
            CA-->>S: Dados válidos
            S->>DB: Reset error count
        else Falha continua
            S->>ES: Incrementa error count
            S->>DB: UPDATE nextCheckAt = agora + (interval * 2^errorCount)
            Note over DB: Máximo 24h entre tentativas
        end
    end
```

#### **Tratamento de Dados Inconsistentes**
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant CA as Carriers API
    participant DV as Data Validator
    participant DB as MongoDB
    participant KP as Kafka Producer
    
    S->>CA: Busca eventos
    CA-->>S: Retorna dados da API
    S->>DV: Valida estrutura dos eventos
    
    alt Dados válidos
        DV-->>S: Eventos validados
        S->>DB: Processa normalmente
    else Dados inválidos/corrompidos
        DV-->>S: Erro de validação
        S->>S: Log detalhado do erro
        S->>KP: Publica "tracking.error.detected"
        S->>DB: Marca código para revisão manual
        Note over DB: status = "needs_review"
    end
```

### **📊 3. Otimizações de Performance**

#### **Processamento em Lotes**
```typescript
// Pseudo-código do processamento otimizado
class BatchTrackingProcessor {
  async processPendingCodes(): Promise<void> {
    const pendingCodes = await this.getPendingCodes(100); // Lote de 100
    
    // Agrupa por transportadora para otimizar rate limits
    const codesByCarrier = this.groupByCarrier(pendingCodes);
    
    for (const [carrier, codes] of codesByCarrier) {
      await this.processCarrierBatch(carrier, codes);
      await this.sleep(1000); // 1s entre transportadoras
    }
  }
  
  async processCarrierBatch(carrier: string, codes: TrackingCode[]): Promise<void> {
    // Processa em paralelo respeitando rate limits
    const concurrency = this.getRateLimitFor(carrier); // Ex: 10 req/min
    
    await Promise.allSettled(
      codes.map(code => 
        this.semaphore.acquire(() => this.processCode(code))
      )
    );
  }
}
```

#### **Cache Inteligente**
```typescript
// Estratégias de cache baseadas no status
class IntelligentCacheStrategy {
  getCacheTTL(trackingStatus: TrackingStatus): number {
    return {
      'delivered': 3600,        // 1h - dados não mudam
      'in_transit': 300,        // 5min - pode mudar
      'out_for_delivery': 60,   // 1min - muda rapidamente
      'exception': 180,         // 3min - situação instável
      'pending': 900            // 15min - raramente muda
    }[trackingStatus] || 300;
  }
  
  getCacheKey(trackingCode: string, includeEvents: boolean): string {
    return includeEvents 
      ? `tracking:${trackingCode}:full`
      : `tracking:${trackingCode}:summary`;
  }
}
```

---

## 🏆 Critérios de Avaliação

### **🎯 Aspectos Avaliados:**
1. **Arquitetura** (25%): Design de microserviços, separação de responsabilidades
2. **Código** (25%): Qualidade, padrões, TypeScript usage
3. **Integração** (20%): Carriers API, Kafka, MongoDB
4. **Testes** (15%): Cobertura, casos edge, mocks
5. **Documentação** (15%): Clareza, completude, exemplos

### **🥇 Bonus Points:**
- **Observabilidade**: Métricas customizadas, tracing
- **Security**: Rate limiting, input validation, secrets management
- **Performance**: Otimizações, caching inteligente
- **DevOps**: CI/CD pipeline, health checks avançados

---

