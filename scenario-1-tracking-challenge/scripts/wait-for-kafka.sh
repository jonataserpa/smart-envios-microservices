#!/bin/bash

# Script para aguardar o Kafka estar pronto
set -e

KAFKA_HOST=${KAFKA_HOST:-kafka}
KAFKA_PORT=${KAFKA_PORT:-9092}
MAX_ATTEMPTS=${MAX_ATTEMPTS:-30}
ATTEMPT=1

echo "Aguardando Kafka estar disponível em $KAFKA_HOST:$KAFKA_PORT..."

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if nc -z $KAFKA_HOST $KAFKA_PORT 2>/dev/null; then
    echo "Kafka está disponível!"
    exit 0
  fi
  
  echo "Tentativa $ATTEMPT/$MAX_ATTEMPTS: Kafka não está disponível ainda..."
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

echo "Timeout: Kafka não ficou disponível após $MAX_ATTEMPTS tentativas"
exit 1
