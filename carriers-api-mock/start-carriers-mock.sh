#!/bin/bash

# Script para iniciar apenas o Carriers API Mock

echo "🚚 Iniciando Carriers API Mock"
echo "=============================="

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
cd carriers-api-mock
docker compose down
cd ..

# Construir e iniciar o Carriers Mock
echo "🔨 Construindo e iniciando Carriers API Mock..."
cd carriers-api-mock
docker compose up -d --build
cd ..

# Aguardar serviço ficar pronto
echo "⏳ Aguardando serviço ficar pronto..."
sleep 10

# Verificar status
echo "📊 Verificando status do serviço..."
cd carriers-api-mock
docker compose ps
cd ..

echo ""
echo "✅ Carriers API Mock iniciado com sucesso!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   🚚 Carriers Mock:    http://localhost:3001"
echo "   📋 Health Check:     http://localhost:3001/health"
echo "   📊 Admin Codes:      http://localhost:3001/admin/codes"
echo ""
echo "🧪 Testes disponíveis:"
echo "   curl http://localhost:3001/health"
echo "   curl -H 'Authorization: Bearer eyJtest' http://localhost:3001/client/Carriers/Tracking/SM82886187440BM"
echo ""
echo "📝 Logs do serviço:"
echo "   cd carriers-api-mock && docker compose logs -f carriers-api-mock"
