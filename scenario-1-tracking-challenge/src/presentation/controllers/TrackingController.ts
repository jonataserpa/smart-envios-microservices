import { Request, Response } from 'express';
import { AddTrackingCodeUseCase } from '@application/commands/AddTrackingCodeUseCase';
import { UpdateTrackingUseCase } from '@application/commands/UpdateTrackingUseCase';
import { GetTrackingQuery } from '@application/queries/GetTrackingQuery';
import { ListTrackingQuery } from '@application/queries/ListTrackingQuery';
import { AddTrackingCodeCommand } from '@application/commands/AddTrackingCodeCommand';
import { ApiResponse } from '@shared/types';
import { HTTP_STATUS } from '@shared/constants';

export class TrackingController {
  constructor(
    private readonly addTrackingUseCase: AddTrackingCodeUseCase,
    private readonly updateTrackingUseCase: UpdateTrackingUseCase,
    private readonly getTrackingQuery: GetTrackingQuery,
    private readonly listTrackingQuery: ListTrackingQuery,
    private readonly logger: any
  ) {}

  async addTracking(req: Request, res: Response): Promise<void> {
    try {
      const command: AddTrackingCodeCommand = req.body;
      
      const result = await this.addTrackingUseCase.execute(command);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Código de rastreamento adicionado com sucesso',
        timestamp: new Date().toISOString()
      };

      res.status(HTTP_STATUS.CREATED).json(response);

    } catch (error) {
      this.handleError(res, error, 'Erro ao adicionar código de rastreamento');
    }
  }

  async getTracking(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      
      if (!code) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'MISSING_TRACKING_CODE',
            message: 'Código de rastreamento é obrigatório'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.getTrackingQuery.execute(code);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      res.status(HTTP_STATUS.OK).json(response);

    } catch (error) {
      this.handleError(res, error, 'Erro ao buscar rastreamento');
    }
  }

  async refreshTracking(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      
      if (!code) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'MISSING_TRACKING_CODE',
            message: 'Código de rastreamento é obrigatório'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const events = await this.updateTrackingUseCase.execute(code);

      const response: ApiResponse = {
        success: true,
        data: {
          trackingCode: code,
          refreshedAt: new Date().toISOString(),
          eventsCount: events.length,
          events: events.map(e => e.toJSON())
        },
        message: 'Rastreamento atualizado com sucesso',
        timestamp: new Date().toISOString()
      };

      res.status(HTTP_STATUS.OK).json(response);

    } catch (error) {
      this.handleError(res, error, 'Erro ao atualizar rastreamento');
    }
  }

  async listTracking(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        customerId: req.query.customerId as string,
        carrier: req.query.carrier as string,
        status: req.query.status as string,
        isDelivered: req.query.isDelivered ? req.query.isDelivered === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort: req.query.sort as string,
        includeEvents: req.query.includeEvents === 'true'
      };

      const result = await this.listTrackingQuery.execute(query);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      res.status(HTTP_STATUS.OK).json(response);

    } catch (error) {
      this.handleError(res, error, 'Erro ao listar rastreamentos');
    }
  }

  private handleError(res: Response, error: any, message: string): void {
    this.logger.error(message, {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack
    });

    const statusCode = this.getStatusCodeFromError(error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || message,
        details: error.details
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }

  private getStatusCodeFromError(error: any): number {
    if (error.name?.includes('ValidationError')) {
      return HTTP_STATUS.BAD_REQUEST;
    }
    
    if (error.name?.includes('NotFoundError')) {
      return HTTP_STATUS.NOT_FOUND;
    }
    
    if (error.name?.includes('AlreadyExistsError')) {
      return HTTP_STATUS.CONFLICT;
    }
    
    if (error.name?.includes('RateLimitError')) {
      return HTTP_STATUS.TOO_MANY_REQUESTS;
    }
    
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}
