# 📋 **Principais Operações da API - Guia Detalhado**

Este documento explica em detalhes cada operação do microserviço de rastreamento, sua ordem de execução e contexto de uso.

## 🔄 **Ordem de Execução Típica**

A API segue uma **sequência lógica** de operações que simula o **ciclo de vida completo** de um rastreamento:

```
1. Health Check → 2. Adicionar Código → 3. Consultar Status → 
4. (Opcional) Refresh Manual → 5. Monitoramento Automático → 
6. Listagem/Relatórios → 7. Métricas/Observabilidade
```

---

## **🟢 1. Health Check - A Primeira Verificação**

**Endpoint:** `GET /api/v1/health`

### **📝 Contexto e Propósito:**
- **É SEMPRE a primeira operação** que qualquer cliente deve executar
- **Verifica se o microserviço está funcionando** e todas as dependências estão conectadas
- **Load balancers e sistemas de monitoramento** usam para decidir se o serviço está saudável
- **Evita erro 500** em operações posteriores verificando problemas antecipadamente

### **🔧 O que acontece internamente:**
1. **Testa MongoDB**: Faz uma query simples para verificar conectividade
2. **Testa Redis**: Verifica se o cache está respondendo
3. **Testa Kafka**: Confirma se pode publicar eventos
4. **Testa Carriers API**: Faz uma requisição de teste para a API externa
5. **Calcula métricas**: Retorna estatísticas em tempo real do serviço

### **✅ Quando usar:**
- **Startup da aplicação cliente** (frontend, mobile app)
- **Monitoramento contínuo** (a cada 30 segundos)
- **Antes de operações críticas** em lote
- **Debug de problemas** de conectividade

### **⚠️ Possíveis problemas:**
- Carriers API fora do ar → impacto alto
- MongoDB desconectado → serviço inutilizável
- Redis indisponível → performance degradada
- Kafka com problemas → eventos não são publicados

### **📊 Exemplo de resposta saudável:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "mongodb": { "status": "connected", "responseTime": "12ms" },
    "redis": { "status": "connected", "responseTime": "3ms" },
    "kafka": { "status": "connected", "responseTime": "8ms" },
    "carriersApi": { "status": "available", "responseTime": "145ms" }
  },
  "metrics": {
    "activeTrackingCodes": 1250,
    "processedToday": 3420,
    "errorRate": "0.2%",
    "avgResponseTime": "89ms"
  }
}
```

---

## **➕ 2. Adicionar Código de Rastreamento - Início do Monitoramento**

**Endpoint:** `POST /api/v1/tracking`

### **📝 Contexto e Propósito:**
- **Primeira operação funcional** após confirmar que o sistema está saudável
- **Inicia o ciclo de vida** de um código de rastreamento no sistema
- **Faz consulta inicial** à API Carriers para obter eventos já existentes
- **Configura monitoramento automático** via scheduler para verificações futuras

### **🔧 O que acontece internamente:**
1. **Valida o código**: Formato, transportadora suportada, não duplicado
2. **Consulta inicial**: Faz GET na API Carriers para buscar eventos existentes
3. **Mapeia eventos**: Converte formato Carriers para formato interno
4. **Salva no MongoDB**: Persiste código + eventos + metadados
5. **Calcula próxima verificação**: Define quando o scheduler deve verificar novamente
6. **Publica evento**: Informa outros microserviços que novo código foi adicionado
7. **Retorna resposta**: Código salvo + eventos iniciais + próxima verificação

### **✅ Quando usar:**
- **Cliente fez uma compra** e recebeu código de rastreamento
- **Integração com e-commerce** automaticamente após fechamento de pedido
- **Importação em lote** de códigos históricos
- **API pública** para clientes adicionarem códigos manualmente

### **🎯 Exemplo prático:**
```
Cliente compra produto → Sistema gera pedido → Transportadora fornece código SM123BR → 
Frontend chama POST /tracking → Sistema verifica na Carriers → 
Encontra "Postado em São Paulo" → Salva no banco → 
Agenda próxima verificação para 5 minutos → 
Notifica cliente por email que rastreamento está ativo
```

### **⚠️ Possíveis problemas:**
- Código inválido → erro 400 imediato
- Código já existe → erro 409 conflito
- Carriers API retorna erro → salva código mas sem eventos iniciais
- Rate limit atingido → reagenda tentativa

### **📊 Exemplo de request:**
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

---

## **🔍 3. Consultar Código Específico - Verificação de Status**

**Endpoint:** `GET /api/v1/tracking/{code}`

### **📝 Contexto e Propósito:**
- **Operação mais frequente** após adicionar código
- **Retorna dados atuais** sem forçar nova consulta à API externa
- **Usa cache Redis** para melhorar performance e reduzir carga
- **Interface principal** para mostrar status ao cliente final

### **🔧 O que acontece internamente:**
1. **Valida formato** do código de rastreamento
2. **Verifica cache Redis** primeiro (dados dos últimos 60 segundos)
3. **Se não em cache**, consulta MongoDB para dados mais recentes
4. **Monta timeline** completa dos eventos ordenados por data
5. **Calcula métricas** (dias desde postagem, tempo estimado de entrega)
6. **Atualiza cache** para próximas consultas
7. **Retorna resposta** estruturada com todos os eventos e resumo

### **✅ Quando usar:**
- **Cliente quer ver status atual** (página de rastreamento)
- **Chatbot** respondendo pergunta sobre entrega
- **Dashboard interno** mostrando múltiplos pedidos
- **API mobile** para notificações push
- **Integração com CRM** para suporte ao cliente

### **🎯 Exemplo prático:**
```
Cliente acessa "Onde está meu pedido?" → Frontend chama GET /tracking/SM123BR →
Sistema verifica cache (miss) → Busca no MongoDB → 
Encontra 3 eventos: "Postado → Em trânsito → Saiu para entrega" →
Calcula "2 dias desde postagem, entrega estimada hoje às 18h" →
Retorna dados estruturados → Frontend mostra timeline visual
```

### **⚠️ Performance:**
- **Cache hit**: Resposta em ~20ms
- **Cache miss**: Resposta em ~100ms
- **Alto volume**: Rate limit de 500 req/min por endpoint

### **📊 Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "trackingCode": "SM82886187440BM",
    "carrier": "Carriers",
    "status": "active",
    "currentStatus": "Saiu para entrega",
    "isDelivered": false,
    "events": [
      {
        "timestamp": "2025-01-20T10:30:00.000Z",
        "status": "Postado",
        "location": "São Paulo, SP",
        "description": "Objeto postado"
      },
      {
        "timestamp": "2025-01-22T09:15:00.000Z",
        "status": "Saiu para entrega",
        "location": "Rio de Janeiro, RJ",
        "description": "Objeto saiu para entrega"
      }
    ],
    "summary": {
      "totalEvents": 3,
      "daysSincePosted": 2,
      "estimatedDelivery": "2025-01-22T18:00:00.000Z"
    }
  }
}
```

---

## **🔄 4. Forçar Atualização (Refresh) - Dados em Tempo Real**

**Endpoint:** `POST /api/v1/tracking/{code}/refresh`

### **📝 Contexto e Propósito:**
- **Operação sob demanda** quando cliente quer dados mais recentes
- **Ignora cache e scheduler** para consultar API Carriers imediatamente
- **Usado em situações urgentes** ou quando há suspeita de atraso nos dados
- **Rate limited** para evitar abuso e respeitar limites da API externa

### **🔧 O que acontece internamente:**
1. **Verifica rate limit** (máximo 1 refresh a cada 5 minutos por código)
2. **Ignora cache Redis** completamente
3. **Força consulta** à API Carriers em tempo real
4. **Compara eventos** novos com dados existentes no MongoDB
5. **Se há mudanças**, salva novos eventos e atualiza timeline
6. **Publica evento Kafka** se status mudou significativamente
7. **Atualiza agenda** do scheduler baseado no novo status
8. **Retorna diferencial** (o que mudou + dados completos)

### **✅ Quando usar:**
- **Cliente reclama** que status não mudou há muito tempo
- **Suporte ao cliente** investigando problema específico
- **Momentos críticos** como "saiu para entrega" ou "tentativa de entrega"
- **Integração real-time** para sistemas críticos
- **Debug manual** de problemas de sincronização

### **🎯 Exemplo prático:**
```
Cliente liga: "Meu pacote saiu para entrega há 6 horas, cadê?" →
Atendente clica "Forçar atualização" → Sistema chama Carriers API →
Descobre novo evento: "Entregue às 14:30" → Atualiza banco →
Publica evento "tracking.delivered" → Outros sistemas enviam email de confirmação →
Retorna para atendente: "Entregue! Cliente será notificado automaticamente"
```

### **⚠️ Limitações:**
- **Máximo 20 req/min** no endpoint
- **Cooldown de 5 minutos** por código
- **Pode falhar** se Carriers API estiver sobrecarregada
- **Não usar** para polling contínuo

### **📊 Exemplo de resposta com mudanças:**
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
        "timestamp": "2025-01-22T11:30:00.000Z",
        "status": "Entregue",
        "location": "Rio de Janeiro, RJ",
        "description": "Objeto entregue ao destinatário",
        "isDelivered": true,
        "recipient": "João Silva"
      }
    ],
    "summary": {
      "isDelivered": true,
      "deliveredAt": "2025-01-22T11:30:00.000Z",
      "deliveryTime": {
        "days": 2,
        "hours": 1,
        "totalMinutes": 2940
      }
    }
  },
  "message": "Rastreamento atualizado com sucesso - Pacote entregue!"
}
```

---

## **📋 5. Listar Códigos com Filtros - Visão Panorâmica**

**Endpoint:** `GET /api/v1/tracking`

### **📝 Contexto e Propósito:**
- **Operação de overview** para dashboards e relatórios gerenciais
- **Permite filtros complexos** para segmentar dados
- **Suporta paginação** para lidar com grandes volumes
- **Usado por analytics** e sistemas de Business Intelligence

### **🔧 O que acontece internamente:**
1. **Processa filtros** (cliente, status, período, transportadora, etc.)
2. **Monta query MongoDB** otimizada com índices apropriados
3. **Aplica paginação** para evitar sobrecarga de memória
4. **Calcula agregações** (totais, médias, percentuais)
5. **Formata resultado** com metadados de paginação
6. **Retorna summary** com estatísticas do conjunto filtrado

### **✅ Quando usar:**
- **Dashboard executivo** mostrando KPIs de entrega
- **Relatório mensal** de performance por transportadora
- **Suporte ao cliente** buscando todos os pedidos de um cliente
- **Análise de problemas** filtrando códigos com erro
- **Exportação de dados** para auditoria ou BI

### **🎯 Filtros disponíveis:**
```javascript
// Filtros básicos
?customerId=customer_123&status=active&page=1&limit=50

// Filtros avançados
?carrier=Carriers&isDelivered=false&createdAt[gte]=2025-01-20
&sort=-createdAt&includeEvents=false

// Filtros de análise
?deliveryTime[lte]=2&errorCount[gte]=1&priority=high
```

### **🎯 Exemplo prático:**
```
Gerente quer relatório: "Quantos pacotes estão atrasados?" →
Sistema filtra: status=active AND daysSincePosted>5 AND isDelivered=false →
Retorna: 23 códigos atrasados, tempo médio 7.2 dias, 87% são da transportadora X →
Gera alerta automático para time de operações
```

### **📊 Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "trackingCode": "SM82886187440BM",
        "carrier": "Carriers",
        "customerId": "customer_123",
        "status": "active",
        "currentStatus": "Saiu para entrega",
        "isDelivered": false,
        "createdAt": "2025-01-22T10:35:00.000Z",
        "eventsCount": 3,
        "daysSincePosted": 2
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 48,
      "itemsPerPage": 10
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

## **⚡ 6. Métricas Prometheus - Observabilidade**

**Endpoint:** `GET /metrics`

### **📝 Contexto e Propósito:**
- **Operação de monitoramento** para sistemas DevOps
- **Expõe métricas internas** em formato padrão Prometheus
- **Usado por alertas** e dashboards de infraestrutura
- **Não requer autenticação** (endpoint público de health)

### **🔧 Métricas expostas:**
1. **Contadores de códigos** por status (active, completed, error)
2. **Eventos processados** por transportadora
3. **Latência de requests** por endpoint (histograma)
4. **Execuções do scheduler** (sucessos vs erros)
5. **Erros da API externa** por tipo (timeout, not_found, rate_limit)
6. **Tempo de entrega** por transportadora (histograma)

### **✅ Quando usar:**
- **Grafana dashboards** em tempo real
- **Alertas automáticos** (error rate > 5%)
- **Capacity planning** (throughput crescendo)
- **SLA monitoring** (P95 latency < 2s)
- **Debug de performance** (gargalos identificados)

### **🎯 Exemplo prático:**
```
Alerta dispara: "Error rate > 10% nos últimos 5 minutos" →
DevOps acessa Grafana → Vê métricas: tracking_carrier_api_errors_total{error_type="timeout"} →
Identifica: API Carriers está lenta → 
Aumenta timeout temporariamente → 
Contata Carriers para investigar problema deles
```

### **📊 Exemplo de métricas:**
```prometheus
# HELP tracking_codes_total Total number of tracking codes
# TYPE tracking_codes_total counter
tracking_codes_total{status="active"} 1250
tracking_codes_total{status="completed"} 3420

# HELP tracking_api_requests_duration_seconds Duration of API requests
# TYPE tracking_api_requests_duration_seconds histogram
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="0.1"} 1250
tracking_api_requests_duration_seconds_bucket{endpoint="/tracking",method="GET",le="0.5"} 2100

# HELP tracking_scheduler_runs_total Number of scheduler executions
# TYPE tracking_scheduler_runs_total counter
tracking_scheduler_runs_total{status="success"} 1440
tracking_scheduler_runs_total{status="error"} 12
```

---

## **🔄 Monitoramento Automático via Scheduler**

### **📝 O Papel do Background Scheduler:**
Entre as operações manuais da API, roda **continuamente** o **TrackingScheduler**:

1. **A cada 1 minuto**: Verifica códigos que precisam de atualização
2. **Consulta Carriers**: Para códigos na hora certa (intervalos inteligentes)
3. **Atualiza MongoDB**: Se encontrou novos eventos
4. **Publica Kafka**: Para notificar outros microserviços
5. **Reagenda**: Próxima verificação baseada no status atual

### **🎯 Intervalos inteligentes:**
- **Código recém-postado**: Verifica a cada 5 minutos
- **Em trânsito há dias**: Verifica a cada 30 minutos
- **Saiu para entrega**: Verifica a cada 10 minutos
- **Entregue**: Para de verificar (status final)

---

## **💡 Fluxo Completo - Cenário Real**

### **📦 Do começo ao fim:**

```
14:00 - Cliente compra produto online
14:01 - E-commerce chama: POST /tracking (código SM123BR)
14:01 - Sistema consulta Carriers: "Postado em SP"
14:01 - Salva no banco, agenda próxima verificação para 14:06
14:01 - Publica: tracking.added → Notification Service → Email "Rastreamento ativado"

14:06 - Scheduler roda automaticamente
14:06 - Verifica SM123BR na Carriers: ainda "Postado"
14:06 - Nenhuma mudança, reagenda para 14:11

14:30 - Cliente acessa "Onde está?"
14:30 - Frontend chama: GET /tracking/SM123BR
14:30 - Sistema retorna cache: "Postado há 30 minutos"

16:45 - Scheduler detecta novo evento: "Em trânsito - Campinas"
16:45 - Salva evento, publica tracking.updated
16:45 - Notification Service → SMS "Seu pedido está a caminho"

16:50 - Cliente nervoso chama suporte
16:50 - Atendente força: POST /tracking/SM123BR/refresh
16:50 - Consulta real-time: confirma "Em trânsito para RJ"
16:50 - Atendente: "Chegará amanhã, relaxe!"

18:00 - Gerente quer relatório
18:00 - Sistema chama: GET /tracking?createdAt[gte]=today
18:00 - Retorna: 45 códigos hoje, 67% entregues, tempo médio 1.2 dias

20:00 - Prometheus alert: API Carriers lenta
20:00 - DevOps verifica: GET /metrics
20:00 - Identifica problema, ajusta timeouts

+ Dia seguinte +
09:30 - Scheduler detecta: "Entregue - João Silva"
09:30 - Marca como completed, para monitoramento
09:30 - Publica tracking.delivered → Email confirmação + NPS survey
```

---

## **📊 Rate Limits e Melhores Práticas**

### **⚠️ Limitações por Endpoint:**

| Endpoint | Rate Limit | Recomendação |
|----------|------------|--------------|
| `GET /health` | 200 req/min | Use para health checks automáticos |
| `POST /tracking` | 100 req/min | Batch operations quando possível |
| `GET /tracking/{code}` | 500 req/min | Cache results no frontend |
| `POST /tracking/{code}/refresh` | 20 req/min | Apenas quando necessário |
| `GET /tracking` | 50 req/min | Use paginação adequada |
| `GET /metrics` | Ilimitado | Endpoint público |

### **💡 Melhores Práticas:**

1. **Sempre verificar health** antes de operações em lote
2. **Usar cache** para consultas frequentes
3. **Implementar retry** com backoff exponencial
4. **Monitorar métricas** continuamente
5. **Respeitar rate limits** para evitar throttling
6. **Usar refresh** apenas em casos emergenciais

---

**Essa documentação fornece um guia completo para qualquer desenvolvedor integrar com o microserviço de rastreamento de forma eficiente e seguindo as melhores práticas!** 🚀
