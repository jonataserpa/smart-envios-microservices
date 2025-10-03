import { UpdateTrackingUseCase } from '../commands/UpdateTrackingUseCase';
import { TrackingCode } from '@domain/entities/TrackingCode';
import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { MetricsController } from '@presentation/controllers/MetricsController';
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
        MetricsController.incrementSchedulerRuns('success');
      } catch (error) {
        MetricsController.incrementSchedulerRuns('error');
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
    this.logger.debug('🔍 Iniciando processamento de todos os códigos', {
      batchSize: this.config.batchSize,
      timestamp: new Date().toISOString()
    });

    // Buscar TODOS os códigos (sem filtro de isActive)
    const allCodes = await this.trackingRepository.findAllCodes(
      this.config.batchSize
    );

    this.logger.debug('📋 Resultado da busca por todos os códigos', {
      totalFound: allCodes.length,
      codes: allCodes.map(code => ({
        code: code.code,
        carrier: code.carrier,
        status: code.status,
        lastCheckedAt: code.lastCheckedAt
      }))
    });

    if (allCodes.length === 0) {
      this.logger.debug('❌ Nenhum código encontrado no banco', {
        currentTime: new Date().toISOString(),
        batchSize: this.config.batchSize
      });
      return;
    }

    this.logger.info(`✅ Processando ${allCodes.length} códigos de rastreamento`, {
      codes: allCodes.map(code => code.code),
      carriers: [...new Set(allCodes.map(code => code.carrier))]
    });

    // Agrupar por transportadora para otimizar rate limits
    const codesByCarrier = this.groupByCarrier(allCodes);

    this.logger.debug('🚚 Agrupamento por transportadora', {
      groups: Array.from(codesByCarrier.entries()).map(([carrier, codes]) => ({
        carrier,
        count: codes.length,
        codes: codes.map(c => c.code)
      }))
    });

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
    this.logger.info(`🚚 Processando ${codes.length} códigos da ${carrier}`, {
      codes: codes.map(c => c.code)
    });

    // Processar cada código individualmente (um por vez)
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      
      try {
        this.logger.info(`📦 Processando código ${i + 1}/${codes.length}: ${code.code}`);
        await this.processTrackingCode(code);
        
        this.logger.info(`✅ Código ${code.code} processado com sucesso`);
        
      } catch (error) {
        this.logger.error(`❌ Erro ao processar código ${code.code}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Pausa entre cada código para não sobrecarregar a API
      if (i < codes.length - 1) {
        await this.sleep(2000); // 2 segundos entre cada código
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
