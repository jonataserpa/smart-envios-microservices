#!/bin/bash

# Script para verificar a saúde do Kafka e diagnosticar problemas

set -e

echo "🔍 Verificando saúde do ambiente Kafka..."

# Função para verificar se container está rodando
check_container() {
    local container_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        echo "✅ Container $container_name está rodando"
        return 0
    else
        echo "❌ Container $container_name não está rodando"
        return 1
    fi
}

# Função para verificar logs de erro
check_logs() {
    local container_name=$1
    echo "📋 Últimas linhas de log do $container_name:"
    docker logs --tail 10 $container_name 2>&1 | sed 's/^/   /'
    echo ""
}

# Verificar containers
echo "📦 Verificando containers..."
check_container "tracking-zookeeper"
check_container "tracking-kafka"
check_container "tracking-mongodb"
check_container "tracking-redis"

echo ""

# Verificar conectividade do Zookeeper
echo "🔌 Testando conectividade do Zookeeper..."
if docker exec tracking-zookeeper bash -c "echo ruok | nc localhost 2181" 2>/dev/null | grep -q "imok"; then
    echo "✅ Zookeeper está respondendo corretamente"
else
    echo "❌ Zookeeper não está respondendo"
    check_logs "tracking-zookeeper"
fi

echo ""

# Verificar conectividade do Kafka
echo "🔌 Testando conectividade do Kafka..."
if docker exec tracking-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
    echo "✅ Kafka está respondendo corretamente"
else
    echo "❌ Kafka não está respondendo"
    check_logs "tracking-kafka"
fi

echo ""

# Verificar tópicos do Kafka
echo "📋 Listando tópicos do Kafka..."
if docker exec tracking-kafka kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null; then
    echo "✅ Kafka tópicos acessíveis"
else
    echo "❌ Não foi possível listar tópicos do Kafka"
fi

echo ""

# Verificar cluster ID
echo "🆔 Verificando Cluster ID do Kafka..."
if docker exec tracking-kafka cat /var/lib/kafka/data/meta.properties 2>/dev/null | grep cluster.id; then
    echo "✅ Cluster ID encontrado"
else
    echo "❌ Cluster ID não encontrado ou arquivo não existe"
fi

echo ""

# Verificar uso de memória
echo "💾 Verificando uso de memória dos containers..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep tracking

echo ""

# Verificar portas
echo "🌐 Verificando portas abertas..."
netstat -tlnp 2>/dev/null | grep -E ":(2181|9092|9093|3000|6379|27017)" || echo "   Nenhuma porta relevante encontrada"

echo ""
echo "🏁 Verificação concluída!"
