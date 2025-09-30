# Carriers API Mock

Mock da API Carriers para simulação de rastreamento de pedidos no ambiente de desenvolvimento.

## 🚀 Funcionalidades

- **Simulação completa** da API Carriers
- **Dados mockados** de rastreamento com diferentes status
- **Autenticação** via Bearer Token
- **Rate limiting** simulado
- **Health check** para monitoramento
- **Endpoints de teste** para diferentes cenários

## 📋 Endpoints Disponíveis

### 📖 Documentação Swagger
```
GET /api-docs
```
**Interface interativa com toda a documentação da API**

### Health Check
```
GET /health
```

### Status Detalhado
```
GET /status
```

### Rastreamento
```
GET /client/Carriers/Tracking/{code}
Authorization: Bearer {token}
```

### Admin (para testes)
```
GET /admin/codes
```

### Testes de Erro
```
GET /client/Carriers/Tracking/ERROR    # Simula erro 500
GET /client/Carriers/Tracking/TIMEOUT  # Simula timeout
```

## 🔑 Autenticação

Use qualquer token que comece com `eyJ` para autenticação:
```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     http://localhost:3001/client/Carriers/Tracking/SM82886187440BM
```

## 📦 Códigos de Teste Disponíveis

- `SM82886187440BM` - Em trânsito
- `SM82886187441BM` - Saiu para entrega  
- `SM82886187442BM` - Entregue
- `SM82886187443BM` - Tentativa de entrega

## 🐳 Docker

```bash
# Build da imagem
docker build -t carriers-api-mock .

# Executar container
docker run -p 3001:3001 carriers-api-mock
```

## 🧪 Testes

```bash
# 📖 Acessar documentação Swagger
# Abra no navegador: http://localhost:3001/api-docs

# Health check
curl http://localhost:3001/health

# Status detalhado
curl http://localhost:3001/status

# Listar códigos disponíveis
curl http://localhost:3001/admin/codes

# Consultar rastreamento
curl -H "Authorization: Bearer eyJtest" \
     http://localhost:3001/client/Carriers/Tracking/SM82886187440BM

# Testar erro simulado
curl -H "Authorization: Bearer eyJtest" \
     http://localhost:3001/client/Carriers/Tracking/ERROR
```

## 🔧 Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📊 Status de Rastreamento

- **Objeto postado** - Objeto recebido na unidade de origem
- **Em trânsito** - Objeto em transporte para destino
- **Saiu para entrega** - Objeto saiu para entrega
- **Entregue** - Objeto entregue ao destinatário
- **Tentativa de entrega** - Tentativa de entrega falhou
- **Endereço incorreto** - Endereço de entrega incorreto
- **Destinatário ausente** - Destinatário não encontrado
