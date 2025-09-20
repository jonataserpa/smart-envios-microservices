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
