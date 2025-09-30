import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SmartEnvios Tracking Microservice API',
    version: '1.0.0',
    description: 'API para rastreamento automatizado de pedidos com integração à API Carriers',
    contact: {
      name: 'SmartEnvios Team',
      email: 'tech@smartenvios.com.br',
      url: 'https://smartenvios.com.br'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Servidor de Desenvolvimento'
    },
    {
      url: 'https://api.smartenvios.com.br/tracking/v1',
      description: 'Servidor de Produção'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT para autenticação'
      },
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Chave de API para acesso'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Mensagem de erro'
          },
          code: {
            type: 'string',
            description: 'Código do erro'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp do erro'
          }
        },
        required: ['success', 'error']
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            example: 'Validation failed'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Campo com erro'
                },
                message: {
                  type: 'string',
                  description: 'Mensagem de erro do campo'
                }
              }
            }
          }
        }
      },
      TrackingCode: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID único do código de rastreamento'
          },
          code: {
            type: 'string',
            description: 'Código de rastreamento',
            example: 'SM82886187440BM'
          },
          carrier: {
            type: 'string',
            description: 'Transportadora',
            example: 'Carriers'
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception'],
            description: 'Status atual do rastreamento'
          },
          isActive: {
            type: 'boolean',
            description: 'Se o rastreamento está ativo'
          },
          lastCheckedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Última verificação'
          },
          nextCheckAt: {
            type: 'string',
            format: 'date-time',
            description: 'Próxima verificação'
          },
          checkInterval: {
            type: 'number',
            description: 'Intervalo de verificação em segundos'
          },
          events: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/TrackingEvent'
            }
          },
          metadata: {
            $ref: '#/components/schemas/TrackingMetadata'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data de criação'
          }
        }
      },
      TrackingEvent: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID único do evento'
          },
          trackingCodeId: {
            type: 'string',
            format: 'uuid',
            description: 'ID do código de rastreamento'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Data e hora do evento'
          },
          status: {
            type: 'string',
            description: 'Status do evento',
            example: 'Em trânsito'
          },
          location: {
            type: 'string',
            description: 'Localização do evento',
            example: 'São Paulo, SP'
          },
          description: {
            type: 'string',
            description: 'Descrição do evento',
            example: 'Objeto em trânsito'
          },
          isDelivered: {
            type: 'boolean',
            description: 'Se o evento indica entrega'
          },
          isException: {
            type: 'boolean',
            description: 'Se o evento é uma exceção'
          },
          carrierRawData: {
            type: 'object',
            description: 'Dados brutos da transportadora'
          },
          processedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data de processamento'
          }
        }
      },
      TrackingMetadata: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: 'ID do cliente'
          },
          orderId: {
            type: 'string',
            description: 'ID do pedido'
          },
          contractId: {
            type: 'string',
            description: 'ID do contrato'
          },
          errorCount: {
            type: 'number',
            description: 'Contador de erros'
          },
          lastErrorAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data do último erro'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Tags do rastreamento'
          }
        }
      },
      CreateTrackingCodeRequest: {
        type: 'object',
        required: ['code', 'carrier'],
        properties: {
          code: {
            type: 'string',
            description: 'Código de rastreamento',
            example: 'SM82886187440BM',
            minLength: 1,
            maxLength: 50
          },
          carrier: {
            type: 'string',
            description: 'Transportadora',
            example: 'Carriers',
            enum: ['Carriers', 'Correios', 'Jadlog', 'Total Express']
          },
          metadata: {
            $ref: '#/components/schemas/TrackingMetadata'
          }
        }
      },
      TrackingCodeResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/TrackingCode'
          }
        }
      },
      TrackingListResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/TrackingCode'
                }
              },
              pagination: {
                $ref: '#/components/schemas/PaginationMetadata'
              },
              summary: {
                $ref: '#/components/schemas/TrackingSummary'
              }
            }
          }
        }
      },
      PaginationMetadata: {
        type: 'object',
        properties: {
          currentPage: {
            type: 'number',
            description: 'Página atual'
          },
          totalPages: {
            type: 'number',
            description: 'Total de páginas'
          },
          totalItems: {
            type: 'number',
            description: 'Total de itens'
          },
          itemsPerPage: {
            type: 'number',
            description: 'Itens por página'
          },
          hasNextPage: {
            type: 'boolean',
            description: 'Tem próxima página'
          },
          hasPreviousPage: {
            type: 'boolean',
            description: 'Tem página anterior'
          }
        }
      },
      TrackingSummary: {
        type: 'object',
        properties: {
          totalActive: {
            type: 'number',
            description: 'Total de rastreamentos ativos'
          },
          totalDelivered: {
            type: 'number',
            description: 'Total de entregues'
          },
          totalInTransit: {
            type: 'number',
            description: 'Total em trânsito'
          },
          totalExceptions: {
            type: 'number',
            description: 'Total de exceções'
          }
        }
      },
      HealthCheckResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
            description: 'Status geral do serviço'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp da verificação'
          },
          version: {
            type: 'string',
            description: 'Versão da aplicação'
          },
          uptime: {
            type: 'number',
            description: 'Tempo de atividade em segundos'
          },
          dependencies: {
            type: 'object',
            properties: {
              database: {
                $ref: '#/components/schemas/DependencyStatus'
              },
              cache: {
                $ref: '#/components/schemas/DependencyStatus'
              },
              carriersApi: {
                $ref: '#/components/schemas/DependencyStatus'
              }
            }
          },
          metrics: {
            type: 'object',
            properties: {
              activeTrackingCodes: {
                type: 'number',
                description: 'Códigos de rastreamento ativos'
              },
              totalTrackingCodes: {
                type: 'number',
                description: 'Total de códigos de rastreamento'
              },
              averageResponseTime: {
                type: 'number',
                description: 'Tempo médio de resposta em ms'
              }
            }
          }
        }
      },
      DependencyStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['connected', 'disconnected'],
            description: 'Status da dependência'
          },
          responseTime: {
            type: 'string',
            description: 'Tempo de resposta'
          },
          error: {
            type: 'string',
            description: 'Mensagem de erro se houver'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de saúde e monitoramento'
    },
    {
      name: 'Tracking',
      description: 'Endpoints de rastreamento de pedidos'
    },
    {
      name: 'Metrics',
      description: 'Endpoints de métricas e monitoramento'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/presentation/routes/*.ts',
    './src/presentation/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
