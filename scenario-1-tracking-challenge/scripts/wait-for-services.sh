#!/bin/bash

# Script para aguardar os serviços ficarem prontos

echo "Aguardando serviços ficarem prontos..."

# Função para aguardar um serviço
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local timeout=${4:-30}
    
    echo "Aguardando $service_name em $host:$port..."
    
    for i in $(seq 1 $timeout); do
        if nc -z $host $port 2>/dev/null; then
            echo "$service_name está pronto!"
            return 0
        fi
        echo "Tentativa $i/$timeout - $service_name ainda não está pronto..."
        sleep 1
    done
    
    echo "Timeout aguardando $service_name"
    return 1
}

# Aguardar MongoDB
wait_for_service localhost 27017 "MongoDB" 60

# Aguardar Redis
wait_for_service localhost 6379 "Redis" 30

# Aguardar Kafka
wait_for_service localhost 9093 "Kafka" 60

# Aguardar Zookeeper
wait_for_service localhost 2181 "Zookeeper" 30

echo "Todos os serviços estão prontos!"
