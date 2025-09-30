import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  const logger = req.app.get('logger');

  // Log do erro
  logger.error('Erro não tratado', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determinar status code
  const statusCode = getStatusCodeFromError(error);

  // Resposta de erro padronizada
  const response: ApiResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
}

function getStatusCodeFromError(error: any): number {
  // Erros de validação
  if (error.name?.includes('ValidationError') || error.name?.includes('ZodError')) {
    return HTTP_STATUS.BAD_REQUEST;
  }

  // Erros de não encontrado
  if (error.name?.includes('NotFoundError')) {
    return HTTP_STATUS.NOT_FOUND;
  }

  // Erros de conflito
  if (error.name?.includes('AlreadyExistsError') || error.name?.includes('ConflictError')) {
    return HTTP_STATUS.CONFLICT;
  }

  // Erros de rate limit
  if (error.name?.includes('RateLimitError')) {
    return HTTP_STATUS.TOO_MANY_REQUESTS;
  }

  // Erros de autenticação/autorização
  if (error.name?.includes('UnauthorizedError')) {
    return HTTP_STATUS.UNAUTHORIZED;
  }

  if (error.name?.includes('ForbiddenError')) {
    return HTTP_STATUS.FORBIDDEN;
  }

  // Erros de serviço indisponível
  if (error.name?.includes('ServiceUnavailableError') || error.name?.includes('CircuitBreakerError')) {
    return HTTP_STATUS.SERVICE_UNAVAILABLE;
  }

  // Erro interno por padrão
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
