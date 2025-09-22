# PRD-001: Setup e Infraestrutura para Microserviço de Rastreamento

## Visão Geral

**Objetivo**: Estabelecer a infraestrutura específica para o microserviço de rastreamento, incluindo setup de desenvolvimento, integrações e ferramentas necessárias para o desafio técnico.

**Duração Estimada**: 1-2 dias úteis  
**Prioridade**: Crítica (Bloqueante)  
**Dependências**: Nenhuma  
**Contexto**: Desafio técnico com microserviços existentes

## Escopo Técnico

### 1. Estrutura do Projeto

#### 1.1 Organização Específica do Tracking
```
scenario-1-tracking-challenge/
├── src/
│   ├── domain/                     # Entidades de rastreamento
│   │   ├── entities/              # TrackingCode, TrackingEvent
│   │   ├── value-objects/         # TrackingStatus, Location
│   │   ├── repositories/          # Interfaces de persistência
│   │   └── services/             # Regras de negócio complexas
│   ├── application/               # Casos de uso
│   │   ├── commands/             # AddTracking, UpdateTracking
│   │   ├── queries/              # GetTracking, ListTracking
│   │   ├── schedulers/           # Background jobs
│   │   └── event-handlers/       # Kafka consumers
│   ├── infrastructure/            # Implementações técnicas
│   │   ├── database/            # MongoDB repositories
│   │   ├── carriers/            # Integração Carriers API
│   │   ├── messaging/           # Kafka producers/consumers
│   │   ├── cache/              # Redis operations
│   │   └── scheduling/         # Cron jobs
│   ├── presentation/             # APIs REST
│   │   ├── controllers/        # HTTP endpoints
│   │   ├── dtos/              # Data transfer objects
│   │   ├── middlewares/       # Validação, auth, etc.
│   │   └── routes/            # Route definitions
│   └── shared/                   # Utilitários
├── tests/                        # Testes completos
│   ├── unit/                    # Testes unitários
│   ├── integration/             # Testes de integração
│   └── e2e/                     # Testes end-to-end
├── docs/                         # Documentação específica
│   ├── api/                     # OpenAPI specs
│   └── deployment/              # Guias de deploy
├── scripts/                      # Scripts de automação
├── .env.example                  # Template de configuração
├── docker-compose.yml           # Ambiente completo local
├── Dockerfile                   # Container da aplicação
├── package.json                 # Dependências Node.js
└── README.md                    # Documentação principal
```

### 2. Infraestrutura Base

#### 2.1 Docker Compose Específico
```yaml
version: '3.8'

services:
  # Aplicação principal
  tracking-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://admin:admin123@mongodb:27017/tracking?authSource=admin
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
      - CARRIERS_API_URL=http://api.carriers.com.br
      - CARRIERS_API_TOKEN=${CARRIERS_API_TOKEN}
    depends_on:
      - mongodb
      - redis
      - kafka
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - tracking-network

  # MongoDB para persistência
  mongodb:
    image: mongo:7.0
    container_name: tracking-mongodb
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin123
      - MONGO_INITDB_DATABASE=tracking
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - tracking-network

  # Redis para cache e rate limiting
  redis:
    image: redis:7.2-alpine
    container_name: tracking-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - tracking-network

  # Kafka para messaging
  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: tracking-kafka
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    ports:
      - "9093:9093"
    depends_on:
      - zookeeper
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - tracking-network

  # Zookeeper para Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: tracking-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
    networks:
      - tracking-network

  # Prometheus para métricas
  prometheus:
    image: prom/prometheus:latest
    container_name: tracking-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - tracking-network

  # Grafana para dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: tracking-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - tracking-network

volumes:
  mongodb_data:
  redis_data:
  kafka_data:
  zookeeper_data:
  prometheus_data:
  grafana_data:

networks:
  tracking-network:
    driver: bridge
```

#### 2.2 Scripts de Inicialização

**MongoDB Init Script (scripts/mongo-init.js)**
```javascript
// Criar usuário específico para tracking
db = db.getSiblingDB('tracking');

db.createUser({
  user: 'tracking_user',
  pwd: 'tracking_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'tracking'
    }
  ]
});

// Criar coleções com esquemas
db.createCollection('tracking_codes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code', 'carrier', 'status', 'isActive'],
      properties: {
        code: {
          bsonType: 'string',
          pattern: '^[A-Z]{2}[0-9]{11}[A-Z]{2}$',
          description: 'Código de rastreamento válido'
        },
        carrier: {
          bsonType: 'string',
          enum: ['Carriers', 'Correios'],
          description: 'Transportadora válida'
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'],
          description: 'Status válido de rastreamento'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Se o código está sendo monitorado'
        }
      }
    }
  }
});

// Criar índices para performance
db.tracking_codes.createIndex({ code: 1 }, { unique: true });
db.tracking_codes.createIndex({ nextCheckAt: 1, isActive: 1 });
db.tracking_codes.createIndex({ carrier: 1, status: 1 });
db.tracking_codes.createIndex({ customerId: 1 });
```

#### 2.3 Configuração de Ambiente

**.env.example**
```bash
# Aplicação
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
MONGODB_URI=mongodb://tracking_user:tracking_pass@localhost:27017/tracking?authSource=tracking
MONGODB_DB_NAME=tracking

# Cache
REDIS_URL=redis://localhost:6379
REDIS_TTL_DEFAULT=300

# Message Broker
KAFKA_BROKERS=localhost:9093
KAFKA_CLIENT_ID=tracking-service
KAFKA_GROUP_ID=tracking-group

# API Externa
CARRIERS_API_URL=http://api.carriers.com.br
CARRIERS_API_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkuY2FycmllcnMuY29tLmJyXC9jbGllbnRcL2xvZ2luIiwiaWF0IjoxNjAzMTIxOTM0LCJuYmYiOjE2MDMxMjE5MzQsImp0aSI6Im1XZ1NucmJDaDlYa08wbGkiLCJzdWIiOjExNzQwLCJwcnYiOiI4N2UwYWYxZWY5ZmQxNTgxMmZkZWM5NzE1M2ExNGUwYjA0NzU0NmFhIiwibmFtZSI6IkFQSSBTTUFSVCBFTlZJT1MiLCJ1c2VybmFtZSI6IkFQSS5TTUFSVEVOVklPUyJ9.DSln97XIpu2PMERsfQY5MjYKiGrQb6NDRh0KYtJ03Rs
CARRIERS_API_TIMEOUT=15000
CARRIERS_API_RETRY_ATTEMPTS=3

# Scheduler
SCHEDULER_INTERVAL=60000
BATCH_SIZE=10
MAX_CONCURRENT_REQUESTS=5

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoramento
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
HEALTH_CHECK_INTERVAL=30000

# Kafka Topics
TOPIC_CONTRACT_CREATED=smartenvios.contract.created
TOPIC_TRACKING_UPDATED=smartenvios.tracking.status.updated
TOPIC_TRACKING_DELIVERED=smartenvios.tracking.delivered
TOPIC_TRACKING_ERROR=smartenvios.tracking.error
```

### 3. Stack Tecnológico

#### 3.1 Dependências Principais (package.json)
```json
{
  "name": "tracking-microservice",
  "version": "1.0.0",
  "description": "Microserviço de rastreamento automatizado",
  "main": "dist/app.js",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "mongoose": "^8.0.3",
    "redis": "^4.6.12",
    "kafkajs": "^2.2.4",
    "axios": "^1.6.2",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "node-cron": "^3.0.3",
    "prom-client": "^15.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/node-cron": "^3.0.11",
    "@types/jest": "^29.5.8",
    "@types/supertest": "^6.0.2",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "prettier": "^3.1.1"
  }
}
```

#### 3.2 Configuração TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. Monitoramento Básico

#### 4.1 Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'tracking-service'
    static_configs:
      - targets: ['tracking-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb:27017']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis:6379']
```

#### 4.2 Health Check Endpoint
```typescript
// Exemplo de implementação
export class HealthController {
  async checkHealth(req: Request, res: Response): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkKafka(),
      this.checkCarriersAPI()
    ]);
    
    const status = checks.every(check => check.status === 'fulfilled') 
      ? 'healthy' 
      : 'unhealthy';
    
    res.status(status === 'healthy' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled' ? 'up' : 'down',
        redis: checks[1].status === 'fulfilled' ? 'up' : 'down',
        kafka: checks[2].status === 'fulfilled' ? 'up' : 'down',
        carriersAPI: checks[3].status === 'fulfilled' ? 'up' : 'down'
      }
    });
  }
}
```

## Entregáveis

### Dia 1: Setup Fundamental
- [ ] Estrutura de pastas do projeto
- [ ] Docker Compose funcionando
- [ ] MongoDB com esquemas e índices
- [ ] Redis configurado
- [ ] Kafka + Zookeeper funcionando
- [ ] Aplicação Node.js básica conectando

### Dia 2: Tooling e Qualidade
- [ ] Testes configurados (Jest)
- [ ] Linting e formatação (ESLint + Prettier)
- [ ] Health checks implementados
- [ ] Métricas básicas do Prometheus
- [ ] Documentação inicial

## Critérios de Aceitação

1. **Ambiente funcional**: `docker-compose up` roda todos os serviços
2. **Conectividade**: Aplicação conecta com MongoDB, Redis e Kafka
3. **Health checks**: Endpoint `/health` retorna status de todos os serviços
4. **Métricas**: Prometheus coleta métricas básicas
5. **Testes**: Pelo menos um teste de integração passando
6. **Documentação**: README com instruções claras de setup

## Comandos Úteis

### Setup Inicial
```bash
# Clonar e configurar
git clone <repo>
cd scenario-1-tracking-challenge

# Instalar dependências
npm install

# Copiar configuração
cp .env.example .env

# Subir infraestrutura
docker-compose up -d

# Aguardar serviços ficarem prontos
./scripts/wait-for-services.sh

# Executar aplicação
npm run dev
```

### Desenvolvimento
```bash
# Testes
npm test
npm run test:watch
npm run test:coverage

# Qualidade de código
npm run lint
npm run format

# Build
npm run build
npm start
```

### Debugging
```bash
# Ver logs dos serviços
docker-compose logs -f tracking-service
docker-compose logs -f mongodb
docker-compose logs -f kafka

# Conectar no MongoDB
docker exec -it tracking-mongodb mongosh tracking

# Conectar no Redis
docker exec -it tracking-redis redis-cli

# Verificar tópicos Kafka
docker exec -it tracking-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Problemas de conectividade Docker | Scripts de wait + health checks |
| Configuração incorreta de variáveis | Validação no startup + .env.example |
| Performance local | Limites de memória nos containers |

## Próximos Passos

Após conclusão desta fase, seguir para implementação da lógica de negócio conforme PRD-002: Core do Microserviço de Rastreamento.

---

**Responsável**: Desenvolvedor do Desafio  
**Revisores**: Tech Lead  
**Última Atualização**: Janeiro 2025
