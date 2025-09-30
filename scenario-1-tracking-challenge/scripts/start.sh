#!/bin/bash

# Script de inicialização do microserviço de rastreamento

echo "🚀 Iniciando Microserviço de Rastreamento SmartEnvios..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js 20+ LTS"
    exit 1
fi

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor, instale o Docker"
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Por favor, instale o Docker Compose"
    exit 1
fi

echo "✅ Pré-requisitos verificados"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚙️ Criando arquivo de configuração..."
    cp env.example .env
    echo "⚠️  Por favor, edite o arquivo .env com suas configurações antes de continuar"
    echo "   Especialmente a variável CARRIERS_API_TOKEN"
    exit 1
fi

# Subir infraestrutura
echo "🐳 Subindo infraestrutura (MongoDB, Redis, Kafka, Prometheus, Grafana)..."
docker-compose up -d

# Aguardar serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
./scripts/wait-for-services.sh

if [ $? -ne 0 ]; then
    echo "❌ Erro ao aguardar serviços ficarem prontos"
    exit 1
fi

echo "✅ Infraestrutura pronta"

# Verificar se é modo desenvolvimento ou produção
if [ "$1" = "prod" ]; then
    echo "🏗️ Construindo aplicação para produção..."
    npm run build
    
    echo "🚀 Iniciando aplicação em modo produção..."
    npm start
else
    echo "🚀 Iniciando aplicação em modo desenvolvimento..."
    npm run dev
fi
