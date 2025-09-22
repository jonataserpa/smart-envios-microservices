# SmartEnvios - Sistema de Microserviços

## 🚀 Visão Geral

O SmartEnvios é uma plataforma completa de microserviços para automação de processos logísticos, incluindo cotação, contratação e rastreamento de fretes. O sistema integra-se com transportadoras e oferece uma interface moderna para clientes.

## 🏗️ Arquitetura

### **Componentes Principais**

- **Frontend**: React + TypeScript + Ant Design
- **API Gateway**: Ponto central de acesso e orquestração
- **Microserviços Backend**: Cotação, Rastreamento e Contratação
- **Infraestrutura**: MongoDB, Redis, Apache Kafka

### **Padrões Arquiteturais**
- Domain Driven Design (DDD)
- Event-Driven Architecture
- API Gateway Pattern
- Circuit Breaker Pattern

> 💡 **Quer entender por que temos múltiplos microserviços?**  
> Leia nossa [**Estratégia de Microserviços**](docs/architecture/microservices-strategy.md) que explica detalhadamente a relação entre Cotação, Contratação e Rastreamento.

## 🏛️ Arquitetura C4 - Diagramas do Sistema

### **C1 - Diagrama de Contexto**
*Visão geral do sistema e suas interações externas*

```mermaid
C4Context
    title Contexto do Sistema SmartEnvios
    
    Person(cliente, "Cliente", "Pessoa física/jurídica que solicita cotações e contrata fretes")
    Person(admin, "Administrador", "Gerencia o sistema e monitora operações")
    
    System(smartenvios, "SmartEnvios", "Sistema de microserviços para automação logística")
    
    System_Ext(carriers, "API Carriers", "Serviço externo de transportadora para cotações e rastreamento")
    System_Ext(viacep, "ViaCEP", "Serviço externo para consulta de endereços por CEP")
    System_Ext(email, "Serviço de Email", "Sistema externo para envio de notificações")
    System_Ext(payment, "Gateway Pagamento", "Sistema externo para processamento de pagamentos")
    
    Rel(cliente, smartenvios, "Solicita cotações, contrata fretes, consulta rastreamento", "HTTPS")
    Rel(admin, smartenvios, "Gerencia sistema, visualiza métricas", "HTTPS")
    Rel(smartenvios, carriers, "Consulta preços, cria contratos, monitora entregas", "HTTPS/REST")
    Rel(smartenvios, viacep, "Consulta endereços por CEP", "HTTPS/REST")
    Rel(smartenvios, email, "Envia notificações de status", "SMTP")
    Rel(smartenvios, payment, "Processa pagamentos de fretes", "HTTPS/REST")
```

### **C2 - Diagrama de Contêineres**
*Aplicações e serviços que compõem o sistema*

```mermaid
C4Container
    title Contêineres do Sistema SmartEnvios
    
    Person(cliente, "Cliente")
    Person(admin, "Administrador")
    
    Container_Boundary(smartenvios, "SmartEnvios") {
        Container(webapp, "Aplicação Web", "React/TypeScript", "Interface do usuário para cotações e contratação")
        Container(gateway, "API Gateway", "Node.js/Express", "Ponto único de entrada, autenticação, rate limiting")
        
        Container(quoteservice, "Microserviço Cotação", "Node.js/TypeScript", "Calcula preços de frete e gerencia cotações")
        Container(trackservice, "Microserviço Rastreamento", "Node.js/TypeScript", "Monitora status de entregas automaticamente")
        Container(contractservice, "Microserviço Contratação", "Node.js/TypeScript", "Gerencia contratos e documentação")
        
        ContainerDb(mongodb, "MongoDB", "NoSQL Database", "Armazena cotações, contratos e eventos de rastreamento")
        Container(redis, "Redis", "Cache/Session Store", "Cache de cotações e sessões de usuário")
        Container(kafka, "Apache Kafka", "Message Broker", "Comunicação assíncrona entre microserviços")
        
        Container(monitoring, "Monitoramento", "Prometheus/Grafana", "Coleta métricas e monitora sistema")
    }
    
    System_Ext(carriers, "API Carriers")
    System_Ext(viacep, "ViaCEP")
    System_Ext(email, "Email Service")
    
    Rel(cliente, webapp, "Acessa interface", "HTTPS")
    Rel(admin, monitoring, "Visualiza métricas", "HTTPS")
    Rel(webapp, gateway, "Faz requisições", "HTTPS/REST API")
    
    Rel(gateway, quoteservice, "Roteia cotações", "HTTP/REST")
    Rel(gateway, trackservice, "Roteia rastreamento", "HTTP/REST")
    Rel(gateway, contractservice, "Roteia contratos", "HTTP/REST")
    
    Rel(quoteservice, mongodb, "Salva cotações", "MongoDB Protocol")
    Rel(trackservice, mongodb, "Salva eventos", "MongoDB Protocol")
    Rel(contractservice, mongodb, "Salva contratos", "MongoDB Protocol")
    
    Rel(quoteservice, redis, "Cache cotações", "Redis Protocol")
    Rel(gateway, redis, "Sessões usuário", "Redis Protocol")
    
    Rel(trackservice, kafka, "Publica eventos", "Kafka Protocol")
    Rel(contractservice, kafka, "Publica eventos", "Kafka Protocol")
    Rel(quoteservice, kafka, "Consome eventos", "Kafka Protocol")
    
    Rel(quoteservice, carriers, "Consulta preços", "HTTPS/REST")
    Rel(trackservice, carriers, "Consulta status", "HTTPS/REST")
    Rel(contractservice, carriers, "Cria contratos", "HTTPS/REST")
    Rel(quoteservice, viacep, "Valida CEPs", "HTTPS/REST")
```

### **C3 - Diagrama de Componentes - Microserviço de Rastreamento**
*Componentes internos do serviço de rastreamento*

```mermaid
C4Component
    title Componentes do Microserviço de Rastreamento
    
    Container_Boundary(trackservice, "Microserviço Rastreamento") {
        Component(controller, "Tracking Controller", "Express Controller", "Endpoints REST para gerenciar rastreamento")
        Component(scheduler, "Tracking Scheduler", "Node-cron", "Agenda verificações periódicas automáticas")
        Component(usecase, "Tracking Use Cases", "Business Logic", "Regras de negócio para rastreamento")
        Component(repository, "Tracking Repository", "Data Access", "Interface para persistência de dados")
        Component(carriersclient, "Carriers Client", "HTTP Client", "Cliente para API da transportadora")
        Component(eventpublisher, "Event Publisher", "Kafka Producer", "Publica eventos de rastreamento")
        Component(mapper, "Data Mapper", "Data Transformation", "Converte dados entre formatos")
        Component(validator, "Business Validator", "Validation Logic", "Valida regras de negócio")
    }
    
    ContainerDb(mongodb, "MongoDB")
    Container(kafka, "Apache Kafka") 
    System_Ext(carriers, "API Carriers")
    
    Rel(controller, usecase, "Chama casos de uso", "Method Call")
    Rel(scheduler, usecase, "Dispara verificações", "Method Call")
    Rel(usecase, repository, "Persiste dados", "Method Call")
    Rel(usecase, carriersclient, "Consulta status", "HTTP")
    Rel(usecase, eventpublisher, "Publica eventos", "Method Call")
    Rel(usecase, mapper, "Transforma dados", "Method Call")
    Rel(usecase, validator, "Valida regras", "Method Call")
    
    Rel(repository, mongodb, "Salva/consulta", "MongoDB Protocol")
    Rel(eventpublisher, kafka, "Publica", "Kafka Protocol")
    Rel(carriersclient, carriers, "HTTP Request", "HTTPS/REST")
```

### **C3 - Diagrama de Componentes - Microserviço de Cotação**
*Componentes internos do serviço de cotação*

```mermaid
C4Component
    title Componentes do Microserviço de Cotação
    
    Container_Boundary(quoteservice, "Microserviço Cotação") {
        Component(quotecontroller, "Quote Controller", "Express Controller", "Endpoints REST para cotações")
        Component(quotelogic, "Quote Business Logic", "Domain Services", "Cálculos e validações de cotação")
        Component(cacheservice, "Cache Service", "Redis Client", "Gerencia cache de cotações")
        Component(quoterepo, "Quote Repository", "Data Access", "Persistência de cotações")
        Component(carriersapi, "Carriers API Client", "HTTP Client", "Integração com transportadora")
        Component(pricecalc, "Price Calculator", "Business Logic", "Algoritmos de cálculo de preço")
        Component(quotevalidator, "Quote Validator", "Validation", "Validações específicas de cotação")
        Component(quotemapper, "Quote Mapper", "Data Transform", "Mapeamento de dados")
    }
    
    ContainerDb(mongodb, "MongoDB")
    Container(redis, "Redis Cache")
    Container(kafka, "Apache Kafka")
    System_Ext(carriers, "API Carriers")
    
    Rel(quotecontroller, quotelogic, "Processa cotação", "Method Call")
    Rel(quotelogic, cacheservice, "Verifica cache", "Method Call")
    Rel(quotelogic, quoterepo, "Salva cotação", "Method Call")
    Rel(quotelogic, carriersapi, "Busca preços", "HTTP")
    Rel(quotelogic, pricecalc, "Calcula preços", "Method Call")
    Rel(quotelogic, quotevalidator, "Valida dados", "Method Call")
    Rel(quotelogic, quotemapper, "Mapeia dados", "Method Call")
    
    Rel(quoterepo, mongodb, "Persiste", "MongoDB Protocol")
    Rel(cacheservice, redis, "Cache", "Redis Protocol")
    Rel(carriersapi, carriers, "Request", "HTTPS/REST")
```

### **C4 - Diagrama de Código - Use Case de Rastreamento**
*Implementação detalhada em nível de código*

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

### **C4 - Diagrama de Código - Sequência de Atualização**
*Fluxo detalhado de atualização de rastreamento*

```mermaid
sequenceDiagram
    participant C as TrackingController
    participant U as UpdateTrackingUseCase  
    participant R as TrackingRepository
    participant CC as CarriersClient
    participant K as KafkaPublisher
    participant DB as MongoDB
    participant API as Carriers API

    C->>U: execute(trackingCode)
    
    U->>R: findByCode(trackingCode)
    R->>DB: query tracking
    DB-->>R: tracking document
    R-->>U: TrackingCode entity
    
    alt tracking not found
        U-->>C: throw TrackingNotFoundError
    end
    
    U->>CC: trackShipment(trackingCode)
    CC->>API: GET /Tracking/{code}
    API-->>CC: tracking response
    CC-->>U: CarriersTrackingResponse
    
    U->>U: processNewEvents(tracking, newEvents)
    
    loop for each new event
        U->>U: create TrackingEvent
        U->>R: saveEvent(event)
        R->>DB: insert event
        
        U->>K: publish('tracking.event.new', eventData)
        K->>K: createEvent(type, data)
        Note over K: Publish to Kafka topic
    end
    
    U->>U: updateTrackingStatus(tracking, allEvents)
    U->>U: calculateNextCheck(tracking)
    U->>R: save(tracking)
    R->>DB: update tracking
    
    alt status changed
        U->>K: publish('tracking.status.changed', statusData)
    end
    
    alt delivered
        U->>K: publish('tracking.delivered', deliveryData)
    end
    
    U-->>C: updated events[]
    C-->>C: return TrackingResponse
```

### **Fluxo de Dados - Event-Driven Architecture**
*Como os eventos fluem pelo sistema*

```mermaid
flowchart TD
    A[Cliente solicita cotação] --> B[Gateway API]
    B --> C[Microserviço Cotação]
    C --> D[API Carriers]
    D --> C
    C --> E[MongoDB - Salva cotação]
    C --> F[Kafka - Evento cotação calculada]
    
    G[Cliente contrata frete] --> B
    B --> H[Microserviço Contratação]
    H --> I[Gera documentos]
    H --> J[Cria contrato na transportadora]
    H --> K[MongoDB - Salva contrato]
    H --> L[Kafka - Evento contrato criado]
    
    L --> M[Microserviço Rastreamento]
    M --> N[Adiciona código para monitoramento]
    
    O[Scheduler - A cada 5-60min] --> M
    M --> P[Consulta API Carriers]
    P --> M
    M --> Q[MongoDB - Atualiza eventos]
    M --> R[Kafka - Evento status alterado]
    
    R --> S[Serviço Notificação]
    S --> T[Email/SMS para cliente]
    
    R --> U[Dashboard Admin]
    U --> V[Métricas em tempo real]
    
    style A fill:#e1f5fe
    style G fill:#e1f5fe
    style T fill:#c8e6c9
    style V fill:#c8e6c9
```

## 📚 Entendendo a Arquitetura C4 - Guia Passo a Passo

### 🎯 **O que é o Modelo C4?**

O **Modelo C4** é como um **mapa com diferentes níveis de zoom** para entender um sistema de software. Imagine que você está olhando uma cidade:

- **C1 (Contexto)**: Vista de satélite - vê a cidade inteira e cidades vizinhas
- **C2 (Contêineres)**: Vista aérea - vê bairros, estradas principais, aeroporto  
- **C3 (Componentes)**: Vista de drone - vê quarteirões, edifícios específicos
- **C4 (Código)**: Vista do térreo - vê dentro dos edifícios, salas, móveis

---

### 🌍 **Nível C1 - CONTEXTO: "A Vista Geral"**

**👥 Para quem**: Gerentes, Product Owners, Stakeholders  
**🎯 Pergunta que responde**: *"O que este sistema faz e quem o usa?"*

#### **O que você vê no C1:**
1. **Sistema SmartEnvios** (nossa "cidade")
2. **Pessoas que usam**:
   - **Cliente**: Pessoa que quer enviar pacotes
   - **Administrador**: Pessoa que gerencia o sistema
3. **Sistemas externos** (outras "cidades"):
   - **API Carriers**: A transportadora de verdade
   - **ViaCEP**: Serviço que sabe todos os endereços do Brasil
   - **Email**: Sistema que manda e-mails
   - **Pagamento**: Sistema que processa cartões de crédito

#### **Como eles conversam:**
```
Cliente → SmartEnvios: "Quero cotação de frete"
SmartEnvios → API Carriers: "Quanto custa enviar?"
SmartEnvios → ViaCEP: "Este CEP existe?"
SmartEnvios → Email: "Mande confirmação para o cliente"
```

#### **Por que começar aqui:**
- ✅ **Todo mundo entende**: Não precisa ser técnico
- ✅ **Mostra o valor**: Fica claro para que serve o sistema
- ✅ **Define fronteiras**: O que é nosso e o que é de terceiros

---

### 📦 **Nível C2 - CONTÊINERES: "Os Bairros da Cidade"**

**👥 Para quem**: Arquitetos, Tech Leads, DevOps  
**🎯 Pergunta que responde**: *"Quais aplicações e bancos temos?"*

#### **O que você vê no C2:**
Agora olhamos **dentro** do SmartEnvios e vemos:

1. **Frontend (React)**: A "loja" onde o cliente interage
2. **API Gateway**: O "porteiro" que controla quem entra
3. **3 Microserviços** (nossas "fábricas"):
   - **Cotação**: Calcula preços
   - **Rastreamento**: Monitora entregas
   - **Contratação**: Cria contratos
4. **Bancos de dados**:
   - **MongoDB**: Onde guardamos tudo
   - **Redis**: Memória rápida para coisas importantes
   - **Kafka**: "Correio interno" entre os serviços

#### **Como funciona o fluxo:**
```
1. Cliente acessa → Frontend React
2. Frontend faz pedido → API Gateway
3. Gateway decide → Qual microserviço chamar
4. Microserviço processa → Salva no MongoDB
5. Microserviço avisa outros → Via Kafka
6. Resposta volta → Gateway → Frontend → Cliente
```

#### **Por que esta organização:**
- ✅ **Escalabilidade**: Cada "fábrica" pode crescer independente
- ✅ **Manutenção**: Se uma quebra, outras continuam
- ✅ **Times**: Equipes podem trabalhar em paralelo
- ✅ **Tecnologia**: Cada serviço pode usar a melhor ferramenta

---

### ⚙️ **Nível C3 - COMPONENTES: "Dentro de Cada Fábrica"**

**👥 Para quem**: Desenvolvedores experientes  
**🎯 Pergunta que responde**: *"Como cada microserviço está organizado por dentro?"*

#### **O que você vê no C3:**
Vamos **dentro do Microserviço de Rastreamento** (nossa fábrica principal):

1. **Controller**: O "atendente" que recebe pedidos
2. **Scheduler**: O "relógio" que trabalha sozinho
3. **Use Cases**: O "cérebro" com as regras de negócio
4. **Repository**: O "arquivo" que organiza dados
5. **Carriers Client**: O "telefone" para falar com transportadora
6. **Event Publisher**: O "carteiro" que manda avisos
7. **Mapper**: O "tradutor" entre formatos diferentes
8. **Validator**: O "fiscal" que verifica se está correto

#### **Como trabalham juntos:**
```
1. Controller recebe → "Quero rastrear XYZ"
2. Controller chama → Use Case
3. Use Case pede → Repository: "Tem este código?"
4. Use Case liga → Carriers Client: "Qual status?"
5. Use Case processa → Novos eventos
6. Use Case salva → Repository → MongoDB
7. Use Case avisa → Event Publisher → Kafka
8. Controller responde → "Aqui estão os eventos"
```

#### **Padrões importantes:**
- 🏗️ **Arquitetura Hexagonal**: Use Case no centro, resto em volta
- 📋 **Repository Pattern**: Interface única para dados
- 🎯 **Single Responsibility**: Cada componente faz uma coisa só
- 🔄 **Dependency Injection**: Componentes recebem o que precisam

---

### 🔧 **Nível C4 - CÓDIGO: "A Planta Baixa"**

**👥 Para quem**: Desenvolvedores que vão implementar  
**🎯 Pergunta que responde**: *"Que classes criar e que métodos implementar?"*

#### **O que você vê no C4:**
Agora vemos o **código que precisa ser escrito**:

#### **Classes principais:**
```typescript
// 🎮 CONTROLLER - Recebe requisições
class TrackingController {
  +addTrackingCode()     // Adiciona novo código
  +getTracking()         // Consulta status
  +refreshTracking()     // Força atualização
  +listTracking()        // Lista vários códigos
}

// 🧠 USE CASE - Regras de negócio
class UpdateTrackingUseCase {
  +execute()             // Método principal
  -processNewEvents()    // Processa novos eventos
  -updateTrackingStatus() // Atualiza status
  -calculateNextCheck()  // Calcula próxima verificação
}

// 📊 ENTIDADES - Objetos do negócio  
class TrackingCode {
  +code: string          // "SM123456789BR"
  +status: TrackingStatus // "Em trânsito"
  +lastCheckedAt: Date   // Última verificação
  +markAsDelivered()     // Marca como entregue
}

class TrackingEvent {
  +timestamp: Date       // Quando aconteceu
  +status: string        // "Saiu para entrega"
  +location: string      // "São Paulo, SP"
  +description: string   // Descrição completa
}
```

#### **Fluxo de execução detalhado:**
```
📞 1. Cliente chama: controller.refreshTracking("SM123456789BR")
     ↓
🧠 2. Controller chama: useCase.execute("SM123456789BR")  
     ↓
🗃️ 3. UseCase pergunta: repository.findByCode("SM123456789BR")
     ↓
📞 4. UseCase liga: carriersClient.trackShipment("SM123456789BR")
     ↓
⚡ 5. UseCase processa: processNewEvents(tracking, newEvents)
     ↓
💾 6. UseCase salva: repository.save(updatedTracking)
     ↓
📢 7. UseCase avisa: eventPublisher.publish("tracking.updated")
     ↓
✅ 8. Controller responde: return updatedEvents
```

#### **O que você ganha com C4:**
- ✅ **Guia direto**: Sabe exatamente que código escrever
- ✅ **Nomes definidos**: Classes e métodos já nomeados
- ✅ **Responsabilidades**: Cada classe tem função específica
- ✅ **Testes**: Sabe o que testar em cada componente
- ✅ **Padrões**: Segue arquitetura limpa automaticamente

---

### 🎯 **Resumo: Quando Usar Cada Nível**

| Nível | Quando Usar | Exemplo de Pergunta |
|-------|-------------|-------------------|
| **C1** | Apresentar para chefe | "Para que serve este sistema?" |
| **C2** | Planejar infraestrutura | "Quantos servidores precisamos?" |
| **C3** | Definir responsabilidades | "Quem cuida do cache?" |
| **C4** | Começar a programar | "Que método implementar primeiro?" |

### 🔄 **Fluxo Natural de Trabalho:**

```
1. 📋 REUNIÃO (C1): "Vamos fazer sistema de frete"
   ↓
2. 🏗️ ARQUITETURA (C2): "Precisa de 3 microserviços + banco"  
   ↓
3. 👥 DESIGN (C3): "Cada serviço terá Controller + UseCase + Repository"
   ↓
4. 💻 CODING (C4): "Primeira classe: TrackingController..."
```

### 💡 **Dica Importante:**
**Não pule níveis!** Cada nível responde perguntas diferentes. Se você pular do C1 direto para o C4, vai tomar decisões técnicas sem entender o contexto de negócio.

**O segredo**: Cada nível é um **zoom mais próximo** do anterior. Mantenha a **consistência** entre todos os níveis - o que você promete no C1 deve ser entregue no C4!

## 📋 Documentação

### **ADRs (Architecture Decision Records)**
- [ADR-001: Arquitetura de Microserviços](./docs/adrs/ADR-001-SmartEnvios-Microservices-Architecture.md)

### **PRDs (Product Requirements Documents)**
- [PRD-001: Setup e Infraestrutura Base](./docs/prds/PRD-001-Setup-Infraestrutura-Base.md) *(5-7 dias)*
- [PRD-002: Microserviço de Cotação](./docs/prds/PRD-002-Microservico-Cotacao-Fretes.md) *(6-8 dias)*
- [PRD-003: Frontend - Tela de Cotação](./docs/prds/PRD-003-Frontend-Tela-Cotacao.md) *(5-6 dias)*
- [PRD-004: Microserviço de Rastreamento](./docs/prds/PRD-004-Microservico-Rastreamento.md) *(7-9 dias)*
- [PRD-005: Frontend - Tela de Contratação](./docs/prds/PRD-005-Frontend-Tela-Contratacao.md) *(6-7 dias)*
- [PRD-006: Microserviço de Contratação](./docs/prds/PRD-006-Microservico-Contratacao.md) *(8-10 dias)*
- [PRD-007: API Gateway e Integração](./docs/prds/PRD-007-API-Gateway-Integracao.md) *(8-10 dias)*

📖 **[Índice Completo dos PRDs](./docs/prds/README.md)**  
📊 **[Acompanhamento de Progresso](./PROGRESS.md)**

## 🛣️ Roadmap de Desenvolvimento

```mermaid
gantt
    title Cronograma SmartEnvios
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    
    section Infraestrutura
    Setup Base :done, infra, 2025-01-20, 7d
    
    section Backend
    Cotação :active, quote, 2025-01-27, 8d
    Rastreamento :tracking, 2025-01-27, 9d
    Contratação :contract, 2025-02-10, 10d
    
    section Frontend
    Tela Cotação :frontend1, 2025-02-03, 6d
    Tela Contratação :frontend2, 2025-02-17, 7d
    
    section Integração
    API Gateway :gateway, 2025-02-24, 10d
    Testes E2E :testing, 2025-03-01, 5d
```

### **Fases de Desenvolvimento**

1. **🏗️ Infraestrutura** (Semana 1)
   - Docker, MongoDB, Kafka, Redis
   - CI/CD e monitoramento básico

2. **⚙️ Core Services** (Semanas 2-4)
   - Microserviço de Cotação
   - Microserviço de Rastreamento
   - Frontend de Cotação

3. **📝 Contratação** (Semanas 4-6)
   - Microserviço de Contratação
   - Frontend de Contratação

4. **🔗 Integração** (Semanas 6-7)
   - API Gateway
   - Testes end-to-end
   - Deploy final

## 🛠️ Stack Tecnológica

### **Backend**
- **Runtime**: Node.js 20+ com TypeScript
- **Frameworks**: Express.js, Fastify
- **Database**: MongoDB
- **Cache**: Redis
- **Messaging**: Apache Kafka
- **Testing**: Jest + Supertest

### **Frontend**
- **Framework**: React 18+ com TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design v5
- **Styling**: SASS/SCSS + CSS Modules
- **State Management**: Context API + useReducer
- **Forms**: React Hook Form + Zod

### **DevOps**
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + Jaeger
- **Logging**: Winston

## 🚀 Quick Start

### **Pré-requisitos**
- Node.js 20+
- Docker e Docker Compose
- Git

### **Setup Inicial**
```bash
# Clone o repositório
git clone <repository-url>
cd smart-envios-microservices

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie a infraestrutura
docker-compose up -d

# Instale dependências (quando os projetos estiverem criados)
# npm install
```

### **Desenvolvimento**
```bash
# Inicie todos os serviços
make dev

# Ou individualmente
make start-infrastructure
make start-backend
make start-frontend
```

## 🔄 Como Usar os Microserviços

### **Ordem de Execução Recomendada**

#### **1. 🏗️ Infraestrutura Base**
```bash
# 1. Configure o ambiente base
docker-compose up -d mongodb redis kafka zookeeper

# 2. Verifique se os serviços estão funcionando
docker-compose ps
curl http://localhost:9090/metrics  # Prometheus
curl http://localhost:3001          # Grafana
```

#### **2. ⚙️ Microserviço de Cotação de Fretes**
```bash
# 1. Inicie o serviço de cotação
cd backend/freight-quote-service
npm install
npm run dev

# 2. Teste a API de cotação
curl -X POST http://localhost:3001/api/v1/quotes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "vY5FvqbFwJoCgPRCihhkylyykset2yfn",
    "zip_code_start": "13660-088",
    "zip_code_end": "38280-000",
    "volumes": [{
      "quantity": 1,
      "weight": 2.5,
      "height": 10,
      "width": 15,
      "length": 20,
      "price": 100.00
    }],
    "amount": 100.00
  }'
```

#### **3. 📦 Microserviço de Rastreamento**

**Função**: Consultar periodicamente a API da transportadora e atualizar eventos de rastreio no sistema.

**Componentes**:
- **Scheduler**: Consultas automáticas periódicas
- **MongoDB**: Armazenamento flexível de eventos  
- **Kafka Producer**: Publicação de eventos para outros serviços
- **API REST**: Interface para consultas síncronas

```bash
# 1. Inicie o serviço de rastreamento  
cd backend/tracking-service
npm install
npm run dev

# 2. Adicione um código de rastreamento
curl -X POST http://localhost:3002/api/v1/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SM82886187440BM",
    "carrier": "Carriers",
    "customerReference": "PEDIDO-001"
  }'

# 3. Consulte status do rastreamento
curl http://localhost:3002/api/v1/tracking/SM82886187440BM

# 4. Força atualização manual (para testes)
curl -X POST http://localhost:3002/api/v1/tracking/SM82886187440BM/refresh
```

**Estrutura de Dados MongoDB**:
```json
{
  "trackingCode": "SM82886187440BM",
  "carrier": "Carriers",
  "status": "in_transit",
  "events": [
    {
      "timestamp": "2025-01-20T10:30:00Z",
      "status": "Em trânsito",
      "location": "São Paulo, SP",
      "description": "Objeto em trânsito"
    },
    {
      "timestamp": "2025-01-21T14:00:00Z", 
      "status": "Entregue",
      "location": "Rio de Janeiro, RJ",
      "description": "Objeto entregue ao destinatário"
    }
  ],
  "lastChecked": "2025-01-21T14:05:00Z",
  "nextCheck": "2025-01-21T15:05:00Z",
  "isActive": true
}
```

**Fluxo Automático**:
1. **Consulta Inicial**: Microserviço consulta API Carriers usando o código
2. **Armazenamento**: Eventos são salvos/atualizados no MongoDB
3. **Publicação Kafka**: Eventos novos são publicados para outros serviços
4. **Notificação**: Serviços consumidores processam e notificam clientes

#### **4. 📋 Microserviço de Contratação**
```bash
# 1. Inicie o serviço de contratação
cd backend/freight-contract-service  
npm install
npm run dev

# 2. Crie um contrato
curl -X POST http://localhost:3003/api/v1/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "quote_service_id": "service-123",
    "customer_id": "customer-456",
    "type": "freight",
    "freightContentStatement": {
      "sender": {
        "document": "12345678901",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "(11) 99999-9999",
        "zipcode": "13660-088",
        "street": "Rua das Flores",
        "number": "123",
        "neighborhood": "Centro",
        "city": "Porto Ferreira",
        "state": "SP"
      },
      "recipient": {
        "document": "98765432101",
        "name": "Maria Santos",
        "email": "maria@email.com", 
        "phone": "(31) 88888-8888",
        "zipcode": "38280-000",
        "street": "Av. Brasil",
        "number": "456",
        "neighborhood": "Centro",
        "city": "Iguatama",
        "state": "MG"
      },
      "items": [{
        "amount": 1,
        "weight": 2.5,
        "height": 10,
        "width": 15,
        "length": 20,
        "description": "Produto de teste",
        "unit_price": 100.00,
        "total_price": 100.00
      }]
    }
  }'
```

#### **5. 🌐 API Gateway**
```bash
# 1. Inicie o gateway (após todos os microserviços)
cd api-gateway
npm install  
npm run dev

# 2. Acesse via gateway (porta 3000)
curl http://localhost:3000/api/v1/quotes/calculate
curl http://localhost:3000/api/v1/tracking/SM82886187440BM
curl http://localhost:3000/api/v1/contracts
```

#### **6. 🖥️ Frontend**
```bash
# 1. Inicie a aplicação React
cd frontend
npm install
npm run dev

# 2. Acesse http://localhost:5173
# Interface completa para cotação e contratação
```

## 🔌 APIs e Integrações

### **API Carriers - Integração Externa**

**Autenticação**: Bearer Token  
**Base URL**: `http://api.carriers.com.br`  
**Token**: `vY5FvqbFwJoCgPRCihhkylyykset2yfn`

#### **Endpoint de Rastreamento**
```bash
# Consulta status de rastreamento
curl --request GET \
  --url http://api.carriers.com.br/client/Carriers/Tracking/SM82886187440BM \
  --header 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkuY2FycmllcnMuY29tLmJyXC9jbGllbnRcL2xvZ2luIiwiaWF0IjoxNjAzMTIxOTM0LCJuYmYiOjE2MDMxMjE5MzQsImp0aSI6Im1XZ1NucmJDaDlYa08wbGkiLCJzdWIiOjExNzQwLCJwcnYiOiI4N2UwYWYxZWY5ZmQxNTgxMmZkZWM5NzE1M2ExNGUwYjA0NzU0NmFhIiwibmFtZSI6IkFQSSBTTUFSVCBFTlZJT1MiLCJ1c2VybmFtZSI6IkFQSS5TTUFSVEVOVklPUyJ9.DSln97XIpu2PMERsfQY5MjYKiGrQb6NDRh0KYtJ03Rs'
```

#### **Resposta Esperada**
```json
{
  "success": true,
  "data": {
    "trackingCode": "SM82886187440BM",
    "status": "in_transit",
    "events": [
      {
        "date_time": "2025-01-20T10:30:00Z",
        "status": "Em trânsito",
        "location": "São Paulo, SP",
        "description": "Objeto postado"
      }
    ],
    "estimatedDelivery": "2025-01-23T17:00:00Z"
  }
}
```

### **Comunicação entre Microserviços**

#### **Síncrona (HTTP)**
- **Cotação → Contratação**: Validação de serviços disponíveis
- **Gateway → Todos**: Roteamento de requisições
- **Frontend → Gateway**: Todas as interações de usuário

#### **Assíncrona (Kafka)**
```bash
# Tópicos Kafka utilizados
smartenvios.tracking.events      # Eventos de rastreamento
smartenvios.contracts.lifecycle  # Ciclo de vida de contratos  
smartenvios.notifications       # Notificações para clientes
smartenvios.quotes.calculated   # Cotações processadas
```

**Exemplo de Evento Kafka**:
```json
{
  "eventType": "tracking.status.changed",
  "timestamp": "2025-01-21T14:00:00Z",
  "data": {
    "trackingCode": "SM82886187440BM",
    "previousStatus": "in_transit",
    "currentStatus": "delivered",
    "location": "Rio de Janeiro, RJ",
    "contractId": "SE25010000001"
  }
}
```

### **Rate Limiting e Timeouts**

| Serviço | Rate Limit | Timeout | Retry |
|---------|------------|---------|-------|
| **Cotações** | 100 req/min | 10s | 3x |
| **Rastreamento** | 200 req/min | 5s | 2x |
| **Contratos** | 50 req/min | 15s | 2x |
| **API Carriers** | 100 req/min | 10s | 3x |

## 📊 Métricas e KPIs

### **Performance**
- Tempo de resposta < 2s para cotações
- Throughput > 1000 req/min
- Uptime > 99.9%

### **Qualidade**
- Cobertura de testes > 80%
- Zero vulnerabilidades críticas
- Documentação 100% atualizada

### **Negócio**
- Conversion rate > 85% (cotação → contratação)
- Error rate < 1%
- Customer satisfaction > 4.5/5

## 🔧 Comandos Úteis

```bash
# Build todos os serviços
make build

# Executar testes
make test

# Limpeza do ambiente
make clean

# Logs dos serviços
make logs

# Health check
make health
```

## 🌟 Funcionalidades Principais

### **✅ Cotação de Fretes**
- Múltiplas transportadoras
- Cache inteligente
- Validações em tempo real
- Comparação de preços

### **📦 Rastreamento Automatizado**
- Polling inteligente
- Eventos em tempo real
- Notificações automáticas
- Histórico completo

### **📋 Contratação Digital**
- Fluxo guiado
- Validação de documentos
- Geração de PDFs
- Integração com transportadoras

## 🔐 Segurança

- Autenticação JWT
- Rate limiting
- Validação de entrada
- CORS configurado
- Logs de auditoria

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

- **Documentação**: [docs/](./docs/)
- **Issues**: GitHub Issues
- **E-mail**: suporte@smartenvios.com

## 👥 Time

- **Tech Lead**: Responsável por decisões arquiteturais
- **Product Owner**: Definição de requisitos
- **DevOps Engineer**: Infraestrutura e deploy
- **Frontend Developers**: Interface e UX
- **Backend Developers**: Microserviços e APIs

---

**Criado por Jonata Serpa**  
**Última atualização**: Janeiro 2025
