# 🔧 Configuração do RedisInsight

## 📋 Passos para Conectar ao Redis

### 1. Acesse o RedisInsight
- **URL**: http://localhost:8001
- O RedisInsight já está rodando e pronto para uso

### 2. Configurar Conexão com Redis

1. **Clique em "Add Redis Database"**

2. **Configure a conexão:**
   - **Host**: `redis` (nome do container)
   - **Port**: `6379`
   - **Database Alias**: `SmartEnvios Tracking`
   - **Username**: (deixe vazio)
   - **Password**: (deixe vazio)

3. **Clique em "Add Redis Database"**

### 3. Explorar Dados

Após conectar, você poderá:

- **Visualizar todas as chaves** do Redis
- **Ver valores** de cada chave
- **Executar comandos** Redis diretamente
- **Monitorar** operações em tempo real
- **Analisar** performance e uso de memória

### 4. Dados Esperados no Redis

O microserviço de tracking usa o Redis para:

- **Cache de cotações**: `quote:cache:*`
- **Rate limiting**: `rate_limit:*`
- **Sessões**: `session:*`
- **Métricas**: `metrics:*`
- **Lock de processamento**: `lock:*`

### 5. Comandos Úteis para Testar

```redis
# Listar todas as chaves
KEYS *

# Ver informações do servidor
INFO

# Ver uso de memória
INFO memory

# Ver estatísticas
INFO stats

# Monitorar comandos em tempo real
MONITOR
```

## 🎯 Benefícios do RedisInsight

- **Interface Visual**: Navegação fácil pelos dados
- **Editor de Comandos**: Execute comandos Redis diretamente
- **Análise de Performance**: Métricas detalhadas
- **Visualização de Estruturas**: JSON, Hash, List, Set, etc.
- **Monitoramento**: Acompanhe operações em tempo real

## 🔍 Troubleshooting

Se não conseguir conectar:

1. Verifique se o Redis está rodando:
   ```bash
   docker compose ps redis
   ```

2. Teste conectividade:
   ```bash
   docker exec tracking-redis redis-cli ping
   ```

3. Verifique logs:
   ```bash
   docker compose logs redis-insight
   ```
