# 📦 Microserviço de Rastreamento - SmartEnvios

Microserviço especializado em rastreamento automatizado de pedidos utilizando a API da transportadora Carriers.

## 🚀 Funcionalidades

- ✅ **Rastreamento Automático**: Verificação periódica de códigos
- ✅ **Integração Carriers API**: Cliente resiliente com circuit breaker
- ✅ **Event-Driven Architecture**: Comunicação assíncrona via Kafka
- ✅ **Cache Inteligente**: Redis para otimização
- ✅ **Health Checks**: Monitoramento de dependências
- ✅ **Métricas Prometheus**: Observabilidade completa

## 🛠️ Tecnologias

- Node.js 20+ LTS + TypeScript 5+
- Express.js 4+ + MongoDB 7+ + Redis 7+
- Apache Kafka 3+ + Prometheus + Grafana
- Docker + Docker Compose

## 🚀 Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp env.example .env

# 3. Subir infraestrutura
docker-compose up -d

# 4. Executar aplicação
npm run dev
```

## 📡 Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/tracking` - Adicionar código
- `GET /api/v1/tracking/{code}` - Consultar rastreamento
- `POST /api/v1/tracking/{code}/refresh` - Forçar atualização
- `GET /api/v1/tracking` - Listar rastreamentos
- `GET /api/v1/metrics` - Métricas Prometheus

## 🧪 Testes

```bash
npm test              # Todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Cobertura
```

## 📊 Monitoramento

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Health Check**: http://localhost:3000/api/v1/health

## 🔄 Fluxo

1. Código adicionado via API/Kafka
2. Consulta inicial na Carriers API
3. Scheduler agenda verificações periódicas
4. Mudanças detectadas automaticamente
5. Eventos Kafka notificam outros serviços
6. Cache otimiza consultas frequentes

## 📈 Intervalos Inteligentes

- `pending`: 5 min
- `in_transit`: 30 min  
- `out_for_delivery`: 10 min
- `delivered`: 0 (para)
- `exception`: 15 min

**Status**: ✅ Implementado e Funcional  
**Versão**: 1.0.0
