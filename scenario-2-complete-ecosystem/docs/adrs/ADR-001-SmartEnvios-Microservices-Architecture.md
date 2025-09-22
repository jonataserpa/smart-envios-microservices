# ADR-001: Arquitetura de Microserviços SmartEnvios

## Status
**Aceito** - Janeiro 2025

## Contexto

A SmartEnvios precisa automatizar o processo de rastreio de pedidos e implementar uma solução completa de cotação e contratação de frete. O sistema atual requer melhorias na eficiência operacional e redução do trabalho manual, além de uma interface moderna para clientes.

## Decisão

Implementaremos uma arquitetura baseada em microserviços com frontend desacoplado, seguindo os princípios de Domain Driven Design (DDD) e Event-Driven Architecture.

## Arquitetura Geral

### Componentes Principais

1. **Frontend (React/TypeScript)**
   - Interface moderna para cotação e contratação de fretes
   - Integração com APIs backend via HTTP
   - Componentes reutilizáveis com Ant Design

2. **Backend (Microserviços)**
   - Microserviço de Cotação de Fretes
   - Microserviço de Rastreamento de Pedidos
   - Microserviço de Contratação de Fretes
   - Gateway API para orquestração

3. **Infraestrutura**
   - Banco de Dados NoSQL (MongoDB) para flexibilidade
   - Message Broker (Apache Kafka) para comunicação assíncrona
   - Cache distribuído (Redis) para otimização
   - Scheduler para tarefas periódicas

### Padrões Arquiteturais

- **Domain Driven Design (DDD)**: Separação clara de domínios de negócio
- **Event-Driven Architecture**: Comunicação assíncrona via eventos
- **CQRS**: Separação de comandos e consultas onde aplicável
- **API Gateway Pattern**: Ponto único de entrada para APIs
- **Circuit Breaker**: Resiliência na comunicação entre serviços

## Principais Decisões Técnicas

### 1. Frontend
- **React com TypeScript**: Tipagem estática e componentes modernos
- **Ant Design**: Componentes prontos e acessibilidade
- **Context API**: Gerenciamento de estado simples e eficaz
- **SASS/SCSS**: Flexibilidade na estilização

### 2. Backend
- **Arquitetura Hexagonal**: Isolamento de regras de negócio
- **MongoDB**: Flexibilidade para eventos de rastreio não estruturados
- **Apache Kafka**: Comunicação assíncrona escalável
- **RESTful APIs**: Padronização e simplicidade

### 3. Integração Externa
- **API Carriers**: Integração com transportadora para rastreamento
- **Webhook Pattern**: Notificações em tempo real
- **Retry Pattern**: Resiliência em falhas de rede

## Fluxos Principais

### 1. Cotação de Frete
```
Cliente → Frontend → API Gateway → Microserviço Cotação → API Externa → Resposta
```

### 2. Rastreamento Automático
```
Scheduler → Microserviço Rastreamento → API Carriers → Kafka → Notificações
```

### 3. Contratação de Frete
```
Cliente → Frontend → API Gateway → Microserviço Contratação → Kafka → Confirmação
```

## Benefícios

1. **Escalabilidade**: Cada microserviço pode escalar independentemente
2. **Manutenibilidade**: Código organizado por domínios de negócio
3. **Flexibilidade**: Facilita mudanças e evoluções futuras
4. **Resiliência**: Isolamento de falhas entre serviços
5. **Testabilidade**: Testes unitários e de integração simplificados

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Complexidade de distribuição | Monitoramento e observabilidade robustos |
| Latência de rede | Cache distribuído e otimização de queries |
| Consistência eventual | Saga pattern para transações distribuídas |
| Debugging complexo | Logging centralizado e tracing distribuído |

## Estrutura do Projeto

```
smart-envios-microservices/
├── docs/                           # Documentação completa
│   ├── prds/                      # Product Requirements Documents
│   ├── architecture/              # Diagramas e especificações
│   └── api/                       # Documentação APIs
├── frontend/                      # Aplicação React
├── backend/                       # Microserviços
│   ├── gateway/                   # API Gateway
│   ├── freight-quote-service/     # Cotação de fretes
│   ├── tracking-service/          # Rastreamento
│   └── freight-contract-service/  # Contratação
├── infrastructure/                # DevOps e infraestrutura
└── shared/                        # Bibliotecas compartilhadas
```

## Próximos Passos

1. Criação da documentação detalhada (PRDs)
2. Setup inicial dos repositórios
3. Implementação do MVP (Minimum Viable Product)
4. Testes de integração
5. Deploy em ambiente de desenvolvimento

## Revisão

Este ADR deve ser revisado a cada milestone significativo do projeto ou quando surgirem necessidades arquiteturais que impactem as decisões aqui descritas.

---

**Autores**: Equipe de Arquitetura SmartEnvios  
**Data**: Janeiro 2025  
**Versão**: 1.0