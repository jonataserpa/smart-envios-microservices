# Documentação - Microserviço de Rastreamento

## 📋 Visão Geral

Esta documentação contém todos os artefatos técnicos necessários para implementar o **Microserviço de Rastreamento** como parte do desafio técnico SmartEnvios.

### 🎯 Contexto do Desafio
- **Objetivo**: Automatizar rastreamento via API Carriers
- **Cenário**: Microserviços de Cotação e Contratação já existem
- **Prazo**: 6 dias úteis
- **Foco**: Implementação isolada e integrações

---

## 🏗️ Architecture Decision Records (ADRs)

### [ADR-001: Arquitetura do Microserviço de Rastreamento](adrs/ADR-001-Tracking-Microservice-Architecture.md)
Decisões arquiteturais fundamentais para o microserviço, incluindo:
- Escolhas tecnológicas e justificativas
- Padrões arquiteturais aplicados (DDD, Event-Driven)
- Estratégias de integração com sistemas existentes
- Considerações de performance e escalabilidade

---

## 📋 Product Requirements Documents (PRDs)

### [PRD-001: Setup e Infraestrutura](prds/PRD-001-Setup-Infraestrutura-Tracking.md)
Especificações para estabelecer a base do projeto:
- **Duração**: 1-2 dias úteis
- **Entregas**: Docker Compose, MongoDB, Redis, Kafka, aplicação base
- **Critérios**: Ambiente funcional completo

### [PRD-002: Core do Microserviço](prds/PRD-002-Core-Tracking-Implementation.md)
Implementação da lógica central de negócio:
- **Duração**: 3-4 dias úteis
- **Entregas**: Domínio, casos de uso, integração Carriers, scheduler
- **Critérios**: Rastreamento automático funcionando

---

## 🔧 Especificações Técnicas

### Stack Tecnológico
- **Runtime**: Node.js 20+ LTS
- **Linguagem**: TypeScript 5+
- **Framework**: Express.js 4+
- **Banco de Dados**: MongoDB 7+
- **Cache**: Redis 7+
- **Message Broker**: Apache Kafka 3+
- **Scheduler**: node-cron
- **HTTP Client**: Axios com circuit breaker
- **Testes**: Jest + Supertest
- **Observabilidade**: Prometheus + Winston

### Padrões Arquiteturais Aplicados
- **Domain Driven Design (DDD)**: Organização por domínio
- **Event-Driven Architecture**: Comunicação assíncrona
- **Clean Architecture**: Separação clara de camadas
- **Repository Pattern**: Abstração de persistência
- **CQRS**: Separação de comandos e consultas
- **Circuit Breaker**: Resiliência em integrações
- **Retry Pattern**: Recuperação de falhas temporárias

### Estrutura do Projeto
```
scenario-1-tracking-challenge/
├── src/
│   ├── domain/          # Entidades, VOs, Regras de Negócio
│   ├── application/     # Casos de Uso, Commands, Queries
│   ├── infrastructure/  # MongoDB, Kafka, Carriers API, Redis
│   ├── presentation/    # Controllers, DTOs, Routes, Middlewares
│   └── shared/         # Utilitários e Constantes
├── tests/              # Unit, Integration, E2E
├── docs/               # Esta documentação
└── scripts/            # Automação e Deploy
```

---

## 🔄 Fluxos Principais

### 1. Recebimento de Código
```
Microserviços Existentes → Kafka → Event Consumer → MongoDB
```

### 2. Verificação Automática
```
Scheduler → MongoDB (códigos pendentes) → Carriers API → Comparação → Kafka Events
```

### 3. Consulta Manual
```
Cliente → REST API → MongoDB → Response com eventos
```

### 4. Notificações
```
Mudança de Status → Kafka → Serviços Interessados → Notificações
```

---

## 📊 Componentes Principais

### Entidades de Domínio
- **TrackingCode** (Aggregate Root): Código de rastreamento principal
- **TrackingEvent** (Entity): Eventos de mudança de status
- **TrackingStatus** (Value Object): Estados do rastreamento
- **TrackingMetadata** (Value Object): Informações auxiliares

### Casos de Uso
- **AddTrackingCodeUseCase**: Adicionar novos códigos
- **UpdateTrackingUseCase**: Atualizar status via Carriers API
- **GetTrackingUseCase**: Consultar dados de rastreamento
- **ListTrackingUseCase**: Listar códigos por critérios

### Integrações
- **CarriersTrackingClient**: Cliente HTTP resiliente para API Carriers
- **KafkaEventPublisher**: Publicação de eventos assíncronos
- **MongoTrackingRepository**: Persistência de dados
- **RedisCache**: Cache e rate limiting

### Automação
- **TrackingScheduler**: Jobs automáticos de verificação
- **TrackingIntervalStrategy**: Estratégia inteligente de intervalos
- **EventConsumer**: Processamento de códigos vindos de outros serviços

---

## 🎯 Endpoints da API

### Principais Operações
```http
POST   /api/v1/tracking              # Adicionar código
GET    /api/v1/tracking/{code}       # Consultar específico
POST   /api/v1/tracking/{code}/refresh # Forçar atualização
GET    /api/v1/tracking              # Listar com filtros
GET    /api/v1/health                # Health check
GET    /metrics                      # Métricas Prometheus
```

### Integração Kafka
```yaml
Topics Consumidos:
  - smartenvios.contract.created     # Novos contratos
  - smartenvios.quote.converted      # Cotações convertidas

Topics Publicados:
  - smartenvios.tracking.status.updated  # Mudanças de status
  - smartenvios.tracking.delivered       # Entregas finalizadas
  - smartenvios.tracking.error           # Problemas detectados
```

---

## 📈 Métricas e Observabilidade

### Métricas de Negócio
- **Códigos ativos**: Quantos estão sendo monitorados
- **Taxa de entrega**: % entregues no prazo estimado
- **Tempo médio**: Desde postagem até entrega
- **Exceções**: % de códigos com problemas

### Métricas Técnicas
- **Throughput**: Códigos processados por hora
- **Latência**: Tempo de resposta da API
- **Error rate**: % de falhas na integração Carriers
- **Cache hit rate**: Eficiência do cache Redis

### Health Checks
- **Database**: Conectividade MongoDB
- **Cache**: Conectividade Redis
- **Message Broker**: Status do Kafka
- **External API**: Disponibilidade Carriers API

---

## 🧪 Estratégia de Testes

### Testes Unitários (70%)
- **Domínio**: Entidades e regras de negócio
- **Casos de Uso**: Lógica de aplicação
- **Serviços**: Mapeamentos e validações

### Testes de Integração (25%)
- **Database**: Operações MongoDB
- **Cache**: Operações Redis
- **External API**: Cliente Carriers (mocked)
- **Messaging**: Kafka producer/consumer

### Testes E2E (5%)
- **Fluxo Completo**: Adição → Verificação → Atualização
- **Cenários de Erro**: API indisponível, dados inválidos
- **Performance**: Carga com múltiplos códigos

### Cobertura Mínima
- **Total**: ≥ 80%
- **Domínio**: ≥ 95%
- **Casos de Uso**: ≥ 90%
- **Integrações**: ≥ 70%

---

## 🚀 Deploy e Operação

### Ambientes
- **Desenvolvimento**: Docker Compose local
- **Testes**: Container isolado para CI
- **Produção**: Kubernetes (futuro)

### Configuração
- **Environment Variables**: Todas externalizadas
- **Secrets**: Token Carriers via env seguro
- **Health Checks**: Kubernetes probes configurados
- **Scaling**: Horizontal baseado em CPU/memória

### Monitoramento
- **Logs**: Structured logging com correlationId
- **Métricas**: Prometheus + Grafana
- **Alertas**: Baseado em SLA de performance
- **Tracing**: Jaeger para requests distribuídos

---

## 📚 Referências e Links

### Documentação Externa
- [API Carriers](http://api.carriers.com.br) - Documentação oficial
- [MongoDB Best Practices](https://docs.mongodb.com/manual/best-practices/)
- [Kafka Node.js](https://kafka.js.org/) - Cliente oficial
- [Express TypeScript](https://expressjs.com/en/advanced/typescript.html)

### Padrões e Conceitos
- [Domain Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Event Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

### Ferramentas
- [Docker Compose](https://docs.docker.com/compose/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Prometheus](https://prometheus.io/docs/introduction/overview/)
- [TypeScript](https://www.typescriptlang.org/docs/)

---

## 🎯 Próximos Passos

1. **Implementação**: Seguir os PRDs na ordem definida
2. **Validação**: Testar com códigos reais da Carriers
3. **Otimização**: Ajustar intervalos baseado em dados reais
4. **Documentação**: Completar OpenAPI specs
5. **Deploy**: Preparar para ambiente de produção

---

**📞 Suporte**: Para dúvidas sobre esta documentação, consulte os ADRs específicos ou os PRDs detalhados.  
**📅 Última Atualização**: Janeiro 2025  
**🔄 Próxima Revisão**: Após implementação completa
