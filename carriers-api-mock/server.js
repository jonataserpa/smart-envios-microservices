const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerConfig = require('./swagger-config');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Swagger configuration
const specs = swaggerJsdoc(swaggerConfig);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Carriers API Mock Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Dados mockados de rastreamento
const mockTrackingData = {
  // Códigos válidos com diferentes status
  'SM82886187440BM': {
    code: 'SM82886187440BM',
    carrier: 'Carriers',
    status: 'Entregue', //'Em trânsito', 
    events: [
      {
        date: '2025-01-20T10:30:00Z',
        status: 'Objeto postado',
        location: 'São Paulo, SP',
        description: 'Objeto postado na unidade de origem'
      },
      {
        date: '2025-01-21T14:00:00Z',
        status: 'Em trânsito',
        location: 'São Paulo, SP',
        description: 'Objeto em trânsito para destino'
      },
      {
        date: '2025-01-21T15:00:00Z',
        status: 'Entregue',
        location: 'Silvianopolis, MG',
        description: 'Chegou em Silvianopolis, MG'
      }
    ]
  },
  'SM82886187441BM': {
    code: 'SM82886187441BM',
    carrier: 'Carriers',
    status: 'Saiu para entrega',
    events: [
      {
        date: '2025-01-20T10:30:00Z',
        status: 'Objeto postado',
        location: 'São Paulo, SP',
        description: 'Objeto postado na unidade de origem'
      },
      {
        date: '2025-01-21T14:00:00Z',
        status: 'Em trânsito',
        location: 'São Paulo, SP',
        description: 'Objeto em trânsito para destino'
      },
      {
        date: '2025-01-22T08:00:00Z',
        status: 'Saiu para entrega',
        location: 'Rio de Janeiro, RJ',
        description: 'Objeto saiu para entrega'
      }
    ]
  },
  'SM82886187442BM': {
    code: 'SM82886187442BM',
    carrier: 'Carriers',
    status: 'Entregue',
    events: [
      {
        date: '2025-01-20T10:30:00Z',
        status: 'Objeto postado',
        location: 'São Paulo, SP',
        description: 'Objeto postado na unidade de origem'
      },
      {
        date: '2025-01-21T14:00:00Z',
        status: 'Em trânsito',
        location: 'São Paulo, SP',
        description: 'Objeto em trânsito para destino'
      },
      {
        date: '2025-01-22T08:00:00Z',
        status: 'Saiu para entrega',
        location: 'Rio de Janeiro, RJ',
        description: 'Objeto saiu para entrega'
      },
      {
        date: '2025-01-22T15:30:00Z',
        status: 'Entregue',
        location: 'Rio de Janeiro, RJ',
        description: 'Objeto entregue ao destinatário'
      }
    ]
  },
  'SM82886187443BM': {
    code: 'SM82886187443BM',
    carrier: 'Carriers',
    status: 'Tentativa de entrega',
    events: [
      {
        date: '2025-01-20T10:30:00Z',
        status: 'Objeto postado',
        location: 'São Paulo, SP',
        description: 'Objeto postado na unidade de origem'
      },
      {
        date: '2025-01-21T14:00:00Z',
        status: 'Em trânsito',
        location: 'São Paulo, SP',
        description: 'Objeto em trânsito para destino'
      },
      {
        date: '2025-01-22T08:00:00Z',
        status: 'Saiu para entrega',
        location: 'Rio de Janeiro, RJ',
        description: 'Objeto saiu para entrega'
      },
      {
        date: '2025-01-22T15:30:00Z',
        status: 'Tentativa de entrega',
        location: 'Rio de Janeiro, RJ',
        description: 'Tentativa de entrega - destinatário ausente'
      }
    ]
  }
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token de acesso requerido',
      code: 'MISSING_TOKEN'
    });
  }

  // Simular validação de token (em produção seria uma validação real)
  if (!token.startsWith('eyJ')) {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  next();
};

// Middleware de rate limiting simples
const rateLimit = (req, res, next) => {
  // Simular rate limiting (em produção seria com Redis)
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 100; // 100 requests por minuto
  
  // Para simplicidade, sempre permitir (em produção seria implementado corretamente)
  next();
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     description: Verifica se o serviço está funcionando corretamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Serviço está saudável
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'carriers-api-mock',
    version: '1.0.0'
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Informações gerais da API
 *     description: Retorna informações básicas sobre o serviço e lista de endpoints disponíveis
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Informações da API retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInfoResponse'
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Carriers API Mock',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      tracking: '/client/Carriers/Tracking/:code',
      admin: '/admin/codes',
      testError: '/client/Carriers/Tracking/ERROR',
      testTimeout: '/client/Carriers/Tracking/TIMEOUT'
    },
    testCodes: Object.keys(mockTrackingData),
    authentication: 'Use Authorization: Bearer eyJtest (ou qualquer token que comece com "eyJ")'
  });
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Status detalhado da API
 *     description: Retorna informações detalhadas sobre o status do serviço, incluindo uptime e uso de memória
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Status detalhado retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
app.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'carriers-api-mock',
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /client/Carriers/Tracking/{code}:
 *   get:
 *     summary: Consultar rastreamento de pedido
 *     description: Consulta o status de rastreamento de um código específico
 *     tags: [Tracking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de rastreamento
 *         example: "SM82886187440BM"
 *     responses:
 *       200:
 *         description: Dados de rastreamento retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackingResponse'
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Código de rastreamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackingErrorResponse'
 *       429:
 *         description: Rate limit excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/client/Carriers/Tracking/:code', authenticateToken, rateLimit, (req, res) => {
  const { code } = req.params;
  
  console.log(`[${new Date().toISOString()}] Consulta de rastreamento: ${code}`);
  
  // Simular delay de rede
  setTimeout(() => {
    if (mockTrackingData[code]) {
      res.json({
        success: true,
        data: mockTrackingData[code],
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Código de rastreamento não encontrado',
        code: 'TRACKING_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
  }, Math.random() * 1000 + 500); // Delay entre 500ms e 1.5s
});

/**
 * @swagger
 * /admin/codes:
 *   get:
 *     summary: Listar códigos de teste disponíveis
 *     description: Retorna uma lista de todos os códigos de rastreamento disponíveis para testes
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de códigos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCodesResponse'
 */
app.get('/admin/codes', (req, res) => {
  const codes = Object.keys(mockTrackingData).map(code => ({
    code,
    status: mockTrackingData[code].status,
    eventsCount: mockTrackingData[code].events.length
  }));
  
  res.json({
    success: true,
    data: codes,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /client/Carriers/Tracking/ERROR:
 *   get:
 *     summary: Simular erro de servidor
 *     description: Endpoint para simular um erro 500 interno do servidor (para testes)
 *     tags: [Test]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       500:
 *         description: Erro interno simulado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/client/Carriers/Tracking/ERROR', authenticateToken, (req, res) => {
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /client/Carriers/Tracking/TIMEOUT:
 *   get:
 *     summary: Simular timeout
 *     description: Endpoint para simular timeout de requisição (para testes)
 *     tags: [Test]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       408:
 *         description: Timeout simulado - a requisição não retorna resposta
 */
app.get('/client/Carriers/Tracking/TIMEOUT', authenticateToken, (req, res) => {
  // Não responder (simular timeout)
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Carriers API Mock rodando na porta ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Tracking: http://localhost:${PORT}/client/Carriers/Tracking/{code}`);
  console.log(`📊 Admin codes: http://localhost:${PORT}/admin/codes`);
  console.log('\n📦 Códigos de teste disponíveis:');
  Object.keys(mockTrackingData).forEach(code => {
    console.log(`   - ${code} (${mockTrackingData[code].status})`);
  });
  console.log('\n🔑 Use qualquer token que comece com "eyJ" para autenticação');
});

module.exports = app;
