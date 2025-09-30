#!/bin/bash

# Script para iniciar apenas o Tracking Service

echo "📋 Iniciando Tracking Service"
echo "============================="

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker compose down -v

# Construir e iniciar o Tracking Service
echo "🔨 Construindo e iniciando Tracking Service..."
docker compose up -d --build

# Aguardar serviço ficar pronto
echo "⏳ Aguardando serviço ficar pronto..."
sleep 30

# Verificar status
echo "📊 Verificando status do serviço..."
docker compose ps

echo ""
echo "✅ Tracking Service iniciado com sucesso!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   📋 Tracking API:     http://localhost:3000"
echo "   📖 Swagger Docs:     http://localhost:3000/api-docs"
echo "   📊 Prometheus:       http://localhost:9090"
echo "   📈 Grafana:          http://localhost:3002 (admin/admin123)"
echo ""
echo "🧪 Testes disponíveis:"
echo "   curl http://localhost:3000/api/v1/health"
echo "   curl http://localhost:3000/api/v1/tracking"
echo ""
echo "📝 Logs do serviço:"
echo "   docker compose logs -f tracking-service"
