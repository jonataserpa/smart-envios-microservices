# PRD-001: Setup e Infraestrutura Base

## Visão Geral

**Objetivo**: Estabelecer a infraestrutura fundamental para o desenvolvimento dos microserviços SmartEnvios, incluindo setup de desenvolvimento, CI/CD, monitoramento e ferramentas de produtividade.

**Duração Estimada**: 5-7 dias úteis  
**Prioridade**: Alta (Crítica)  
**Dependências**: Nenhuma

## Escopo Técnico

### 1. Estrutura do Projeto

#### 1.1 Organização de Repositórios
```
smart-envios-microservices/
├── .github/                    # GitHub Actions e templates
├── docs/                       # Documentação completa
├── docker/                     # Dockerfiles e docker-compose
├── k8s/                        # Manifests Kubernetes (futuro)
├── scripts/                    # Scripts de automação
├── .env.example               # Template de variáveis
├── docker-compose.yml         # Ambiente de desenvolvimento
├── Makefile                   # Comandos automatizados
└── README.md                  # Documentação principal
```

#### 1.2 Configuração de Desenvolvimento
- **Docker Compose**: Ambiente completo local
- **Hot Reload**: Desenvolvimento ágil
- **Volumes**: Persistência de dados local
- **Networks**: Comunicação entre serviços

### 2. Infraestrutura Base

#### 2.1 Banco de Dados
```yaml
mongodb:
  image: mongo:7.0
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=admin123
  ports:
    - "27017:27017"
  volumes:
    - mongodb_data:/data/db
```

#### 2.2 Message Broker
```yaml
kafka:
  image: confluentinc/cp-kafka:latest
  environment:
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
  ports:
    - "9092:9092"

zookeeper:
  image: confluentinc/cp-zookeeper:latest
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181
```

#### 2.3 Cache Distribuído
```yaml
redis:
  image: redis:7.2-alpine
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
```

#### 2.4 Monitoramento e Observabilidade
```yaml
# Prometheus para métricas
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"

# Grafana para dashboards
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"

# Jaeger para tracing distribuído
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"
    - "14268:14268"
```

### 3. Pipeline CI/CD

#### 3.1 GitHub Actions Workflows
```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
      - name: Build
        run: npm run build
```

#### 3.2 Quality Gates
- **Testes unitários**: Mínimo 80% cobertura
- **Linting**: ESLint + Prettier
- **Security scan**: Snyk ou similar
- **Dependencies check**: Audit de dependências

### 4. Ferramentas de Desenvolvimento

#### 4.1 Scripts Makefile
```makefile
.PHONY: dev build test clean

# Ambiente de desenvolvimento
dev:
	docker-compose up -d
	npm run dev

# Build de todos os serviços
build:
	docker-compose build

# Executar testes
test:
	npm run test:unit
	npm run test:integration

# Limpeza do ambiente
clean:
	docker-compose down -v
	docker system prune -f
```

#### 4.2 Documentação Automática
- **API Docs**: Swagger/OpenAPI
- **Code Docs**: JSDoc/TypeDoc
- **Architecture**: PlantUML diagramas

### 5. Configuração de Segurança

#### 5.1 Variáveis de Ambiente
```bash
# Database
MONGODB_URI=mongodb://admin:admin123@localhost:27017/smartenvios?authSource=admin
MONGODB_DB_NAME=smartenvios

# Message Broker
KAFKA_BROKERS=localhost:9092

# Cache
REDIS_URL=redis://localhost:6379

# APIs Externas
CARRIERS_API_URL=http://api.carriers.com.br
CARRIERS_API_TOKEN=vY5FvqbFwJoCgPRCihhkylyykset2yfn

# Monitoring
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

#### 5.2 Secrets Management
- **Desenvolvimento**: .env files (não commitados)
- **Produção**: Kubernetes Secrets ou AWS Secrets Manager
- **CI/CD**: GitHub Secrets

### 6. Estrutura de Logs

#### 6.1 Formato Padrão
```json
{
  "timestamp": "2025-01-20T10:30:00.000Z",
  "level": "info",
  "service": "freight-quote-service",
  "traceId": "1234567890abcdef",
  "spanId": "abcdef1234567890",
  "message": "Cotação processada com sucesso",
  "metadata": {
    "userId": "user123",
    "quoteId": "quote456"
  }
}
```

#### 6.2 Níveis de Log
- **ERROR**: Erros que requerem atenção
- **WARN**: Situações anômalas mas não críticas
- **INFO**: Eventos importantes do sistema
- **DEBUG**: Informações detalhadas para desenvolvimento

## Entregáveis

### Fase 1: Setup Base (2 dias)
- [ ] Estrutura de pastas do projeto
- [ ] Docker Compose configurado
- [ ] Banco de dados MongoDB funcionando
- [ ] Kafka + Zookeeper funcionando
- [ ] Redis funcionando

### Fase 2: Pipeline CI/CD (2 dias)
- [ ] GitHub Actions configurado
- [ ] Testes automatizados
- [ ] Quality gates implementados
- [ ] Build automatizado

### Fase 3: Monitoramento (2 dias)
- [ ] Prometheus configurado
- [ ] Grafana com dashboards base
- [ ] Jaeger para tracing
- [ ] Logs centralizados

### Fase 4: Documentação (1 dia)
- [ ] README completo
- [ ] Scripts de automação
- [ ] Guias de desenvolvimento
- [ ] Troubleshooting guide

## Critérios de Aceitação

1. **Ambiente funcional**: Todos os serviços base rodando via `docker-compose up`
2. **CI/CD operacional**: Pipeline executando com sucesso
3. **Monitoramento ativo**: Métricas sendo coletadas
4. **Documentação completa**: Guias para novos desenvolvedores
5. **Segurança básica**: Secrets management implementado

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Complexidade Docker | Média | Média | Documentação detalhada e scripts automatizados |
| Performance local | Média | Baixa | Otimização de containers e recursos |
| Configuração inicial | Baixa | Alta | Testes em múltiplos ambientes |

## Tecnologias Utilizadas

- **Containerização**: Docker, Docker Compose
- **Orquestração**: Kubernetes (futuro)
- **CI/CD**: GitHub Actions
- **Monitoramento**: Prometheus, Grafana, Jaeger
- **Banco**: MongoDB
- **Cache**: Redis
- **Message Broker**: Apache Kafka

## Próximos Passos

Após a conclusão desta etapa, seguir para o PRD-002: Microserviço de Cotação de Fretes.

---

**Responsável**: DevOps Team  
**Revisores**: Tech Lead, Product Owner  
**Última Atualização**: Janeiro 2025
