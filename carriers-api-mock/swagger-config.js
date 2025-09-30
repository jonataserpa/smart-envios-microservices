const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Carriers API Mock',
    version: '1.0.0',
    description: 'Mock da API Carriers para simulação de rastreamento de pedidos no SmartEnvios',
    contact: {
      name: 'SmartEnvios Team',
      email: 'tech@smartenvios.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desenvolvimento Local'
    }
  ],
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'healthy' },
          timestamp: { type: 'string', format: 'date-time' },
          service: { type: 'string', example: 'carriers-api-mock' },
          version: { type: 'string', example: '1.0.0' }
        }
      },
      StatusResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              service: { type: 'string', example: 'carriers-api-mock' },
              status: { type: 'string', example: 'operational' },
              uptime: { type: 'number', example: 123.45 },
              memory: {
                type: 'object',
                properties: {
                  rss: { type: 'number', example: 63447040 },
                  heapTotal: { type: 'number', example: 11980800 },
                  heapUsed: { type: 'number', example: 9007336 },
                  external: { type: 'number', example: 2192254 },
                  arrayBuffers: { type: 'number', example: 16659 }
                }
              },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      ApiInfoResponse: {
        type: 'object',
        properties: {
          service: { type: 'string', example: 'Carriers API Mock' },
          version: { type: 'string', example: '1.0.0' },
          status: { type: 'string', example: 'running' },
          timestamp: { type: 'string', format: 'date-time' },
          endpoints: {
            type: 'object',
            properties: {
              health: { type: 'string', example: '/health' },
              tracking: { type: 'string', example: '/client/Carriers/Tracking/:code' },
              admin: { type: 'string', example: '/admin/codes' },
              testError: { type: 'string', example: '/client/Carriers/Tracking/ERROR' },
              testTimeout: { type: 'string', example: '/client/Carriers/Tracking/TIMEOUT' }
            }
          },
          testCodes: {
            type: 'array',
            items: { type: 'string' },
            example: ['SM82886187440BM', 'SM82886187441BM', 'SM82886187442BM', 'SM82886187443BM']
          },
          authentication: { type: 'string', example: 'Use Authorization: Bearer eyJtest (ou qualquer token que comece com "eyJ")' }
        }
      },
      TrackingEvent: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time', example: '2025-01-20T10:30:00Z' },
          status: { type: 'string', example: 'Objeto postado' },
          location: { type: 'string', example: 'São Paulo, SP' },
          description: { type: 'string', example: 'Objeto postado na unidade de origem' }
        }
      },
      TrackingData: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'SM82886187440BM' },
          carrier: { type: 'string', example: 'Carriers' },
          status: { type: 'string', example: 'Em trânsito' },
          events: {
            type: 'array',
            items: { $ref: '#/components/schemas/TrackingEvent' }
          }
        }
      },
      TrackingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/TrackingData' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      TrackingErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Código de rastreamento não encontrado' },
          code: { type: 'string', example: 'TRACKING_NOT_FOUND' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      AdminCodeInfo: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'SM82886187440BM' },
          status: { type: 'string', example: 'Em trânsito' },
          eventsCount: { type: 'number', example: 2 }
        }
      },
      AdminCodesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AdminCodeInfo' }
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Erro interno do servidor' },
          code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      NotFoundResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Endpoint não encontrado' },
          code: { type: 'string', example: 'NOT_FOUND' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT para autenticação. Use qualquer token que comece com "eyJ" para testes.'
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints para verificar a saúde do serviço'
    },
    {
      name: 'Tracking',
      description: 'Endpoints de rastreamento de pedidos'
    },
    {
      name: 'Admin',
      description: 'Endpoints administrativos para testes'
    },
    {
      name: 'Test',
      description: 'Endpoints para simulação de erros e cenários de teste'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: ['./server.js']
};

module.exports = options;
