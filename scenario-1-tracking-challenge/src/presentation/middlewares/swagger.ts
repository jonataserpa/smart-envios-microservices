import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@shared/config/swagger';

export function setupSwagger(app: Application): void {
  // Configuração do Swagger UI
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
    `,
    customSiteTitle: 'SmartEnvios Tracking API Documentation'
  };

  // Rota para a documentação Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

  // Rota para o JSON do Swagger
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
