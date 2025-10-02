#!/bin/bash

# Script para inicializar o ambiente Kafka de forma controlada
# Resolve problemas de Cluster ID e dependências

set -e

echo "🚀 Iniciando ambiente SmartEnvios Tracking Service..."

# Função para aguardar serviço estar pronto
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Aguardando $service_name estar pronto na porta $port..."
    
    while [ $attempt -le $max_attempts ]; do
        # Usar diferentes métodos de verificação dependendo do serviço
        if [ "$service_name" = "mongodb" ]; then
            # Para MongoDB, usar mongo shell para verificar
            if docker exec tracking-$service_name mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; then
                echo "✅ $service_name está pronto!"
                return 0
            fi
        elif [ "$service_name" = "redis" ]; then
            # Para Redis, usar redis-cli
            if docker exec tracking-$service_name redis-cli ping >/dev/null 2>&1; then
                echo "✅ $service_name está pronto!"
                return 0
            fi
        else
            # Para outros serviços, usar netcat se disponível
            if docker exec tracking-$service_name nc -z localhost $port 2>/dev/null; then
                echo "✅ $service_name está pronto!"
                return 0
            fi
        fi
        
        echo "   Tentativa $attempt/$max_attempts - $service_name ainda não está pronto..."
        sleep 5
        ((attempt++))
    done
    
    echo "❌ Timeout aguardando $service_name"
    return 1
}

# Função para verificar se o Kafka está realmente funcional
check_kafka_health() {
    echo "🔍 Verificando saúde do Kafka..."
    
    # Aguardar um pouco mais para o Kafka estabilizar
    sleep 10
    
    # Tentar listar tópicos para verificar se o Kafka está funcionando
    if docker exec tracking-kafka kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
        echo "✅ Kafka está funcionando corretamente!"
        return 0
    else
        echo "❌ Kafka não está respondendo corretamente"
        return 1
    fi
}

# Limpar ambiente anterior se existir
echo "🧹 Limpando ambiente anterior..."
docker compose down -v 2>/dev/null || true

# Iniciar Zookeeper primeiro
echo "📦 Iniciando Zookeeper..."
docker compose up -d zookeeper

# Aguardar Zookeeper estar pronto
wait_for_service "zookeeper" 2181

# Aguardar um pouco mais para o Zookeeper estabilizar
echo "⏳ Aguardando Zookeeper estabilizar..."
sleep 10

# Iniciar Kafka
echo "📦 Iniciando Kafka..."
docker compose up -d kafka

# Aguardar Kafka estar pronto
wait_for_service "kafka" 9092

# Verificar saúde do Kafka
check_kafka_health

# Iniciar outros serviços
echo "📦 Iniciando outros serviços..."
docker compose up -d mongodb redis prometheus grafana kafka-ui redis-commander

# Aguardar MongoDB estar pronto
wait_for_service "mongodb" 27017

# Aguardar Redis estar pronto
wait_for_service "redis" 6379

# Iniciar o serviço principal
echo "📦 Iniciando Tracking Service..."
docker compose up -d tracking-service

echo ""
echo "🎉 Ambiente iniciado com sucesso!"
echo ""
echo "📊 Serviços disponíveis:"
echo "   • Tracking Service: http://localhost:3000"
echo "   • Kafka UI: http://localhost:8080"
echo "   • RedisInsight: http://localhost:8001"
echo "   • Grafana: http://localhost:3001 (admin/admin123)"
echo "   • Prometheus: http://localhost:9090"
echo ""
echo "🔍 Para verificar logs:"
echo "   docker compose logs -f tracking-service"
echo "   docker compose logs -f kafka"
echo ""
echo "🛑 Para parar o ambiente:"
echo "   docker compose down"
