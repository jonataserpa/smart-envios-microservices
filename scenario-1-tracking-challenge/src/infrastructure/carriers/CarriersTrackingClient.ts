import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import { TrackingClient } from '@domain/repositories/TrackingClient';
import { CarriersResponse, CarriersEvent } from '@shared/types';
import { 
  CarriersApiError, 
  CarriersTimeoutError, 
  CarriersServerError,
  TrackingNotFoundError,
  RateLimitError 
} from '@shared/errors';

export interface CarriersConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  retryAttempts: number;
}

export class CarriersTrackingClient implements TrackingClient {
  private readonly httpClient: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly config: CarriersConfig,
    private readonly logger: any
  ) {
    this.httpClient = this.createHttpClient();
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: config.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 60000
    });
  }

  async trackShipment(trackingCode: string): Promise<CarriersResponse> {
    try {
      const response = await this.circuitBreaker.fire(trackingCode);
      
      this.logger.debug('Resposta da API Carriers recebida', {
        trackingCode,
        eventsCount: (response as CarriersResponse).events?.length || 0
      });

      return response as CarriersResponse;

    } catch (error) {
      this.logger.error('Erro na consulta à API Carriers', {
        trackingCode,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      if (error instanceof Error && 'code' in error && error.code === 'ETIMEDOUT') {
        throw new CarriersTimeoutError('Timeout na consulta à API Carriers');
      }

      if (error instanceof Error && 'response' in error && (error as any).response?.status === 404) {
        throw new TrackingNotFoundError(`Código ${trackingCode} não encontrado na Carriers`);
      }

      if (error instanceof Error && 'response' in error && (error as any).response?.status === 429) {
        throw new RateLimitError('Rate limit atingido na API Carriers');
      }

      if (error instanceof Error && 'response' in error && (error as any).response?.status >= 500) {
        throw new CarriersServerError('Erro interno da API Carriers');
      }

      throw new CarriersApiError('Erro na comunicação com API Carriers', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Health check não requer autenticação
      const response = await axios.get(`${this.config.baseUrl}/health`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartEnvios-Tracking/1.0'
        }
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Health check da API Carriers falhou', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  private async makeRequest(trackingCode: string): Promise<CarriersResponse> {
    const response = await this.httpClient.get(
      `/client/Carriers/Tracking/${trackingCode}`
    );

    // Validar estrutura da resposta
    this.validateResponse(response.data);

    // Extrair dados da estrutura { success: true, data: { ... } }
    const apiResponse = response.data;
    if (apiResponse.success && apiResponse.data) {
      return apiResponse.data;
    }

    // Fallback para estrutura direta (compatibilidade)
    return apiResponse;
  }

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json',
        'User-Agent': 'SmartEnvios-Tracking/1.0'
      }
    });

    // Request interceptor para logging
    client.interceptors.request.use(request => {
      this.logger.debug('Requisição para API Carriers', {
        url: request.url,
        method: request.method
      });
      return request;
    });

    // Response interceptor para tratamento de erros
    client.interceptors.response.use(
      response => response,
      error => {
        this.logger.warn('Erro na resposta da API Carriers', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  private validateResponse(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new CarriersApiError('Resposta inválida da API Carriers');
    }

    // Validação para estrutura { success: true, data: { ... } }
    if (data.success && data.data) {
      if (data.data.events && !Array.isArray(data.data.events)) {
        throw new CarriersApiError('Campo events deve ser um array');
      }
      return;
    }

    // Validação para estrutura direta (compatibilidade)
    if (data.events && !Array.isArray(data.events)) {
      throw new CarriersApiError('Campo events deve ser um array');
    }
  }
}

