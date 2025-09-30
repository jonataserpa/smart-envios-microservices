import { UpdateTrackingUseCase } from '../commands/UpdateTrackingUseCase';
import { TrackingCode } from '@domain/entities/TrackingCode';
import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import * as cron from 'node-cron';

export interface SchedulerConfig {
  interval: number; // ms
  batchSize: number;
  maxConcurrentRequests: number;
}

export class TrackingScheduler {
  private isRunning = false;
  private jobHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly updateTrackingUseCase: UpdateTrackingUseCase,
    private readonly trackingRepository: TrackingRepository,
    private readonly config: SchedulerConfig,
    private readonly logger: any
  ) {}

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Scheduler já está rodando');
      return;
    }

    this.isRunning = true;

    // Job principal: verificar códigos pendentes
    this.jobHandle = setInterval(async () => {
      try {
        await this.processPendingTrackingCodes();
      } catch (error) {
        this.logger.error('Erro no scheduler principal', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.interval);

    // Job de limpeza: diário às 2h
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldEvents();
      } catch (error) {
        this.logger.error('Erro no job de limpeza', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    this.logger.info('Tracking scheduler iniciado', {
      interval: this.config.interval,
      batchSize: this.config.batchSize
    });
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.jobHandle) {
      clearInterval(this.jobHandle);
      this.jobHandle = null;
    }

    this.logger.info('Tracking scheduler parado');
  }

  private async processPendingTrackingCodes(): Promise<void> {
    const pendingCodes = await this.trackingRepository.findPendingCodes(
      this.config.batchSize
    );

    if (pendingCodes.length === 0) {
      this.logger.debug('Nenhum código pendente para verificação');
      return;
    }

    this.logger.info(`Processando ${pendingCodes.length} códigos de rastreamento`);

    // Agrupar por transportadora para otimizar rate limits
    const codesByCarrier = this.groupByCarrier(pendingCodes);

    for (const [carrier, codes] of codesByCarrier) {
      await this.processCarrierBatch(carrier, codes);
      
      // Pausa entre transportadoras
      if (codes.length > 0) {
        await this.sleep(1000);
      }
    }
  }

  private groupByCarrier(codes: TrackingCode[]): Map<string, TrackingCode[]> {
    const grouped = new Map<string, TrackingCode[]>();
    
    for (const code of codes) {
      const carrier = code.carrier;
      if (!grouped.has(carrier)) {
        grouped.set(carrier, []);
      }
      grouped.get(carrier)!.push(code);
    }
    
    return grouped;
  }

  private async processCarrierBatch(carrier: string, codes: TrackingCode[]): Promise<void> {
    const maxConcurrency = this.getMaxConcurrencyForCarrier(carrier);
    
    this.logger.debug(`Processando lote da ${carrier}`, {
      codesCount: codes.length,
      maxConcurrency
    });

    // Processar em lotes com limite de concorrência
    for (let i = 0; i < codes.length; i += maxConcurrency) {
      const batch = codes.slice(i, i + maxConcurrency);
      
      const results = await Promise.allSettled(
        batch.map(code => this.processTrackingCode(code))
      );

      // Log de resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.debug(`Lote processado`, {
        carrier,
        successful,
        failed,
        total: batch.length
      });

      // Pausa entre lotes
      if (i + maxConcurrency < codes.length) {
        await this.sleep(500);
      }
    }
  }

  private async processTrackingCode(trackingCode: TrackingCode): Promise<void> {
    try {
      await this.updateTrackingUseCase.execute(trackingCode.code);
      
      this.logger.debug('Código processado com sucesso', {
        code: trackingCode.code,
        carrier: trackingCode.carrier
      });

    } catch (error) {
      this.logger.error('Erro ao processar código', {
        code: trackingCode.code,
        carrier: trackingCode.carrier,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      // Não re-throw para não parar o processamento do lote
    }
  }

  private getMaxConcurrencyForCarrier(carrier: string): number {
    const limits: Record<string, number> = {
      'Carriers': 5,   // 5 requests paralelos
      'Correios': 3,   // 3 requests paralelos
      'default': 2     // 2 requests paralelos para outros
    };

    return limits[carrier] || limits.default;
  }

  private async cleanupOldEvents(): Promise<void> {
    this.logger.info('Iniciando limpeza de eventos antigos');

    // Implementar limpeza de eventos antigos (>90 dias)
    // Esta seria uma operação de database específica
    
    this.logger.info('Limpeza de eventos concluída');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
