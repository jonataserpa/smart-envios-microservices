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

## 🎯 Endpoints da API

### **📥 Adicionar Código de Rastreamento**
```http
POST /api/v1/tracking
Content-Type: application/json

{
  "trackingCode": "SM82886187440BM",
  "carrier": "Carriers",
  "contractId": "12345",
  "customerId": "customer_123"
}
```

### **🔍 Consultar Rastreamento** 
```http
GET /api/v1/tracking/SM82886187440BM
```

### **🔄 Forçar Atualização**
```http
POST /api/v1/tracking/SM82886187440BM/refresh
```

### **📋 Listar Rastreamentos**
```http
GET /api/v1/tracking?customerId=customer_123&status=in_transit
```

### **⚙️ Health Check**
```http
GET /api/v1/health
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

### **📅 Prazo Total: 6 Dias Úteis**

```mermaid
gantt
    title Cronograma - Microserviço de Rastreamento
    dateFormat YYYY-MM-DD
    
    section Setup
    Repositório e Docker     :done, setup, 2025-01-22, 1d
    MongoDB + Kafka + Redis  :done, infra, 2025-01-22, 1d
    
    section Core Development  
    API Base + Endpoints     :active, api, 2025-01-23, 1d
    Integração Carriers      :carrier, after api, 1d
    Scheduler + Jobs         :scheduler, after carrier, 1d
    
    section Quality & Deploy
    Testes + Documentação    :testing, after scheduler, 1d
    Docker + Health Checks   :deploy, after testing, 1d
```

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

**🚀 Boa sorte com o desafio! Demonstre suas habilidades em microserviços e automação!**
