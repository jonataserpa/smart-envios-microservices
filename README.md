# SmartEnvios - Microserviços de Rastreamento

Sistema completo de rastreamento automatizado de pedidos com arquitetura de microserviços.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tracking      │    │   Carriers      │    │   MongoDB       │
│   Microservice  │◄──►│   API Mock      │    │   Database      │
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 27017)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │     Kafka      │    │   Prometheus    │
│     Cache       │    │   Messaging    │    │   Metrics       │
│   (Port 6379)   │    │  (Port 9093)   │    │  (Port 9090)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │   Zookeeper     │    │    Grafana      │
                        │   (Port 2181)   │    │  (Port 3002)    │
                        └─────────────────┘    └─────────────────┘
```

## 🚀 Início Rápido

### Opção 1: Serviços Separados
```bash
# 1. Iniciar Carriers API Mock
cd carriers-api-mock
./start-carriers-mock.sh

# 2. Iniciar Tracking Service
cd scenario-1-tracking-challenge
./start-tracking-service.sh
```

### Opção 2: Apenas Carriers Mock
```bash
cd carriers-api-mock
./start-carriers-mock.sh
```

### Opção 3: Apenas Tracking Service
```bash
cd scenario-1-tracking-challenge
./start-tracking-service.sh
```

## 🌐 URLs dos Serviços

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Tracking API** | http://localhost:3000 | API principal de rastreamento |
| **Tracking Swagger** | http://localhost:3000/api-docs | 📖 Documentação interativa da Tracking API |
| **Carriers Mock** | http://localhost:3001 | Mock da API Carriers |
| **Carriers Swagger** | http://localhost:3001/api-docs | 📖 Documentação interativa do Carriers Mock |
| **Kafka UI** | http://localhost:8080 | 🌐 Interface web para Kafka |
| **Prometheus** | http://localhost:9090 | Métricas e monitoramento |
| **Grafana** | http://localhost:3002 | Dashboards (admin/admin123) |

## 🧪 Testes Rápidos

### 📖 Documentação Swagger
- **Tracking API**: http://localhost:3000/api-docs
- **Carriers Mock**: http://localhost:3001/api-docs

### 🌐 Kafka UI - Interface Web
- **URL**: http://localhost:8080
- **Funcionalidades**:
  - Visualizar tópicos e mensagens
  - Monitorar consumidores e produtores
  - Gerenciar configurações do cluster
  - Visualizar métricas em tempo real

### Health Check
```bash
# Tracking Service
curl http://localhost:3000/api/v1/health

# Carriers Mock
curl http://localhost:3001/health
```

### Rastreamento
```bash
# Adicionar código de rastreamento
curl -X POST http://localhost:3000/api/v1/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SM82886187440BM",
    "carrier": "Carriers",
    "metadata": {
      "customerId": "customer-123",
      "orderId": "order-456"
    }
  }'

# Consultar rastreamento
curl http://localhost:3000/api/v1/tracking/SM82886187440BM

# Forçar atualização
curl -X POST http://localhost:3000/api/v1/tracking/SM82886187440BM/refresh
```

### Carriers Mock
```bash
# Listar códigos disponíveis
curl http://localhost:3001/admin/codes

# Consultar diretamente na API Carriers
curl -H "Authorization: Bearer eyJtest" \
     http://localhost:3001/client/Carriers/Tracking/SM82886187440BM
```

## 📦 Códigos de Teste Disponíveis

| Código | Status | Descrição |
|--------|--------|-----------|
| `SM82886187440BM` | Em trânsito | Objeto em transporte |
| `SM82886187441BM` | Saiu para entrega | Objeto saiu para entrega |
| `SM82886187442BM` | Entregue | Objeto entregue |
| `SM82886187443BM` | Tentativa de entrega | Falha na entrega |

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
smart-envios-microservices/
├── scenario-1-tracking-challenge/    # Microserviço de Rastreamento
├── carriers-api-mock/                 # Mock da API Carriers
│   ├── start-carriers-mock.sh        # Script de inicialização do Mock
│   └── docker-compose.yml            # Orquestração do Mock
└── scenario-1-tracking-challenge/   # Tracking Service
    ├── start-tracking-service.sh     # Script de inicialização do Tracking
    └── docker-compose.yml            # Orquestração do Tracking
```

### Comandos Úteis
```bash
# Carriers API Mock
cd carriers-api-mock
docker compose logs -f carriers-api-mock
docker compose restart carriers-api-mock
docker compose down

# Tracking Service
cd scenario-1-tracking-challenge
docker compose logs -f tracking-service
docker compose restart tracking-service
docker compose down

# Parar todos os serviços
# Execute os comandos de parada em cada pasta
```

## 📊 Monitoramento

### Prometheus
- **URL**: http://localhost:9090
- **Métricas**: CPU, memória, requests, tracking codes

### Grafana
- **URL**: http://localhost:3002
- **Login**: admin/admin123
- **Dashboards**: Tracking metrics, system health

## 🛠️ Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Express.js** para APIs REST
- **MongoDB** para persistência
- **Redis** para cache
- **Kafka** para messaging
- **Prometheus** para métricas

### Arquitetura
- **Clean Architecture** + **DDD**
- **Event-Driven Architecture**
- **Microservices**
- **Circuit Breaker Pattern**

## 📚 Documentação

- **API Docs**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-docs.json
- **Health Checks**: Implementados em todos os serviços
- **Logs Estruturados**: Winston com formato JSON

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta já em uso**
   ```bash
   # Verificar processos usando as portas
   lsof -i :3000
   lsof -i :3001
   ```

2. **Kafka não conecta**
   ```bash
   # Limpar volumes e reiniciar
   docker compose down -v
   docker compose up -d
   ```

3. **MongoDB não conecta**
   ```bash
   # Verificar logs
   docker compose logs mongodb
   ```

### Logs Importantes
```bash
# Tracking Service
docker compose logs tracking-service

# Carriers Mock
docker compose logs carriers-api-mock

# Kafka
docker compose logs kafka

# MongoDB
docker compose logs mongodb
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.