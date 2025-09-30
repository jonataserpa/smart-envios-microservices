import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@shared/errors';
import { HTTP_STATUS } from '@shared/constants';

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validar body, query e params
      const validatedData = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params
      });

      // Substituir dados originais pelos validados
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Dados de entrada inválidos',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        );

        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados de entrada inválidos',
            details: error.errors
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      next(error);
    }
  };
}
