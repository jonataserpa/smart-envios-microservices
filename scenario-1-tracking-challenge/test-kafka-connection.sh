#!/bin/bash

# Script para testar a conexão com Kafka
set -e

echo "=== Testando conexão com Kafka ==="

# Verificar se o container está rodando
if ! docker ps | grep -q tracking-kafka; then
  echo "❌ Container tracking-kafka não está rodando"
  exit 1
fi

echo "✅ Container tracking-kafka está rodando"

# Testar conectividade de rede
if docker exec tracking-kafka nc -z localhost 9092; then
  echo "✅ Kafka está respondendo na porta 9092"
else
  echo "❌ Kafka não está respondendo na porta 9092"
  exit 1
fi

# Testar API do Kafka
if docker exec tracking-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
  echo "✅ API do Kafka está funcionando"
else
  echo "❌ API do Kafka não está funcionando"
  exit 1
fi

# Testar conexão externa
if nc -z localhost 9093 2>/dev/null; then
  echo "✅ Porta externa 9093 está acessível"
else
  echo "❌ Porta externa 9093 não está acessível"
fi

echo "=== Teste de conexão concluído com sucesso! ==="
