import mongoose, { Document, Model, Schema } from 'mongoose';
import { TrackingRepository } from '@domain/repositories/TrackingRepository';
import { TrackingCode } from '@domain/entities/TrackingCode';
import { TrackingEvent } from '@domain/entities/TrackingEvent';
import { TrackingListQuery } from '@shared/types';
import { DatabaseError } from '@shared/errors';

interface TrackingCodeDocument extends Document {
  code: string;
  carrier: string;
  status: string;
  isActive: boolean;
  customerId?: string;
  contractId?: string;
  lastCheckedAt: Date;
  nextCheckAt: Date;
  checkInterval: number;
  events: TrackingEventDocument[];
  metadata: {
    contractId?: string;
    customerId?: string;
    origin?: string;
    destination?: string;
    errorCount: number;
    totalChecks: number;
    lastError?: string;
    estimatedDelivery?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface TrackingEventDocument extends Document {
  id: string;
  trackingCodeId: string;
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  isDelivered: boolean;
  isException: boolean;
  carrierRawData: any;
  processedAt: Date;
}

const TrackingEventSchema = new Schema<TrackingEventDocument>({
  id: { type: String, required: true },
  trackingCodeId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  isDelivered: { type: Boolean, required: true },
  isException: { type: Boolean, required: true },
  carrierRawData: { type: Schema.Types.Mixed },
  processedAt: { type: Date, required: true }
}, { _id: false });

const TrackingCodeSchema = new Schema<TrackingCodeDocument>({
  code: { type: String, required: true },
  carrier: { type: String, required: true },
  status: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  customerId: { type: String },
  contractId: { type: String },
  lastCheckedAt: { type: Date, required: true },
  nextCheckAt: { type: Date, required: true },
  checkInterval: { type: Number, required: true },
  events: [TrackingEventSchema],
  metadata: {
    contractId: { type: String },
    customerId: { type: String },
    origin: { type: String },
    destination: { type: String },
    errorCount: { type: Number, default: 0 },
    totalChecks: { type: Number, default: 0 },
    lastError: { type: String },
    estimatedDelivery: { type: Date }
  }
}, {
  timestamps: true,
  collection: 'tracking_codes'
});

// Índices para performance
TrackingCodeSchema.index({ code: 1 }, { unique: true });
TrackingCodeSchema.index({ nextCheckAt: 1, isActive: 1 });
TrackingCodeSchema.index({ carrier: 1, status: 1 });
TrackingCodeSchema.index({ customerId: 1 });
TrackingCodeSchema.index({ contractId: 1 });
TrackingCodeSchema.index({ createdAt: -1 });

export class MongoTrackingRepository implements TrackingRepository {
  private model: Model<TrackingCodeDocument>;

  constructor() {
    this.model = mongoose.model<TrackingCodeDocument>('TrackingCode', TrackingCodeSchema);
  }

  async save(tracking: TrackingCode): Promise<TrackingCode> {
    try {
      const data = tracking.toJSON();
      
      const result = await this.model.findOneAndUpdate(
        { code: data.code },
        {
          $set: {
            ...data,
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      return this.mapToDomain(result);
    } catch (error) {
      throw new DatabaseError('Erro ao salvar código de rastreamento', error);
    }
  }

  async findByCode(code: string): Promise<TrackingCode | null> {
    try {
      const doc = await this.model.findOne({ code });
      return doc ? this.mapToDomain(doc) : null;
    } catch (error) {
      throw new DatabaseError('Erro ao buscar código de rastreamento', error);
    }
  }

  async findById(id: string): Promise<TrackingCode | null> {
    try {
      const doc = await this.model.findById(id);
      return doc ? this.mapToDomain(doc) : null;
    } catch (error) {
      throw new DatabaseError('Erro ao buscar código de rastreamento por ID', error);
    }
  }

  async findPendingCodes(limit: number = 100): Promise<TrackingCode[]> {
    try {
      const query = {
        isActive: true,
        nextCheckAt: { $lte: new Date() }
      };

      const docs = await this.model
        .find(query)
        .limit(limit)
        .sort({ nextCheckAt: 1 });

      return docs.map(doc => this.mapToDomain(doc));
    } catch (error) {
      throw new DatabaseError('Erro ao buscar códigos pendentes', error);
    }
  }

  async findActiveCodes(limit: number = 100): Promise<TrackingCode[]> {
    try {
      const query = {
        isActive: true
      };

      const docs = await this.model
        .find(query)
        .limit(limit)
        .sort({ lastCheckedAt: 1 }); // Ordenar por última verificação (mais antigos primeiro)

      return docs.map(doc => this.mapToDomain(doc));
    } catch (error) {
      throw new DatabaseError('Erro ao buscar códigos ativos', error);
    }
  }

  async findAllCodes(limit: number = 100): Promise<TrackingCode[]> {
    try {
      // Buscar TODOS os códigos (sem filtro algum)
      const docs = await this.model
        .find({})
        .limit(limit)
        .sort({ lastCheckedAt: 1 }); // Ordenar por última verificação (mais antigos primeiro)

      return docs.map(doc => this.mapToDomain(doc));
    } catch (error) {
      throw new DatabaseError('Erro ao buscar todos os códigos', error);
    }
  }

  async findByCustomer(customerId: string): Promise<TrackingCode[]> {
    try {
      const docs = await this.model
        .find({ 'metadata.customerId': customerId })
        .sort({ createdAt: -1 });

      return docs.map(doc => this.mapToDomain(doc));
    } catch (error) {
      throw new DatabaseError('Erro ao buscar códigos por cliente', error);
    }
  }

  async findByContract(contractId: string): Promise<TrackingCode[]> {
    try {
      const docs = await this.model
        .find({ 'metadata.contractId': contractId })
        .sort({ createdAt: -1 });

      return docs.map(doc => this.mapToDomain(doc));
    } catch (error) {
      throw new DatabaseError('Erro ao buscar códigos por contrato', error);
    }
  }

  async list(query: TrackingListQuery): Promise<{ items: TrackingCode[]; total: number }> {
    try {
      const filter: any = {};

      if (query.customerId) {
        filter['metadata.customerId'] = query.customerId;
      }

      if (query.carrier) {
        filter.carrier = query.carrier;
      }

      if (query.status) {
        filter.status = query.status;
      }

      if (query.isDelivered !== undefined) {
        filter.status = query.isDelivered ? 'delivered' : { $ne: 'delivered' };
      }

      if (query.createdAt) {
        filter.createdAt = {};
        if (query.createdAt.gte) {
          filter.createdAt.$gte = query.createdAt.gte;
        }
        if (query.createdAt.lte) {
          filter.createdAt.$lte = query.createdAt.lte;
        }
      }

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const sort: any = {};
      if (query.sort) {
        const [field, order] = query.sort.split(':');
        sort[field] = order === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1;
      }

      const [docs, total] = await Promise.all([
        this.model
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments(filter)
      ]);

      return {
        items: docs.map(doc => this.mapToDomain(doc)),
        total
      };
    } catch (error) {
      throw new DatabaseError('Erro ao listar códigos de rastreamento', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new DatabaseError('Erro ao deletar código de rastreamento', error);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.model.countDocuments();
    } catch (error) {
      throw new DatabaseError('Erro ao contar códigos de rastreamento', error);
    }
  }

  async countByStatus(status: string): Promise<number> {
    try {
      return await this.model.countDocuments({ status });
    } catch (error) {
      throw new DatabaseError('Erro ao contar códigos por status', error);
    }
  }

  async recalculateNextCheck(code: string): Promise<TrackingCode> {
    try {
      const tracking = await this.findByCode(code);
      if (!tracking) {
        throw new DatabaseError(`Código de rastreamento ${code} não encontrado`);
      }

      // Recalcular próxima verificação
      tracking.recalculateNextCheck();

      // Salvar as mudanças
      return await this.save(tracking);
    } catch (error) {
      throw new DatabaseError('Erro ao recalcular próxima verificação', error);
    }
  }

  private mapToDomain(doc: TrackingCodeDocument): TrackingCode {
    const TrackingCode = require('@domain/entities/TrackingCode').TrackingCode;
    const TrackingCodeId = require('@domain/value-objects/TrackingCodeId').TrackingCodeId;
    const TrackingCodeValue = require('@domain/value-objects/TrackingCodeValue').TrackingCodeValue;
    const CarrierValue = require('@domain/value-objects/CarrierValue').CarrierValue;
    const TrackingStatus = require('@domain/value-objects/TrackingStatus').TrackingStatus;
    const TrackingMetadata = require('@domain/value-objects/TrackingMetadata').TrackingMetadata;
    const TrackingEvent = require('@domain/entities/TrackingEvent').TrackingEvent;

    // Criar objetos de valor
    const id = TrackingCodeId.create((doc._id as any).toString());
    const code = TrackingCodeValue.create(doc.code);
    const carrier = CarrierValue.create(doc.carrier);
    const status = TrackingStatus.create(doc.status);
    const metadata = TrackingMetadata.create(doc.metadata);

    // Mapear eventos
    const events = doc.events.map((eventDoc: any) => 
      TrackingEvent.create({
        trackingCodeId: (doc._id as any).toString(),
        timestamp: new Date(eventDoc.timestamp),
        status: eventDoc.status,
        location: eventDoc.location,
        description: eventDoc.description,
        isDelivered: eventDoc.isDelivered,
        isException: eventDoc.isException,
        carrierRawData: eventDoc.carrierRawData
      })
    );

    // Criar instância do TrackingCode usando reflexão
    const trackingCode = Object.create(TrackingCode.prototype);
    
    // Definir propriedades privadas
    Object.defineProperty(trackingCode, '_id', { value: id, writable: false });
    Object.defineProperty(trackingCode, '_code', { value: code, writable: false });
    Object.defineProperty(trackingCode, '_carrier', { value: carrier, writable: false });
    Object.defineProperty(trackingCode, '_status', { value: status, writable: true });
    Object.defineProperty(trackingCode, '_isActive', { value: doc.isActive, writable: true });
    Object.defineProperty(trackingCode, '_lastCheckedAt', { value: new Date(doc.lastCheckedAt), writable: true });
    Object.defineProperty(trackingCode, '_nextCheckAt', { value: new Date(doc.nextCheckAt), writable: true });
    Object.defineProperty(trackingCode, '_checkInterval', { value: doc.checkInterval, writable: true });
    Object.defineProperty(trackingCode, '_events', { value: events, writable: true });
    Object.defineProperty(trackingCode, '_metadata', { value: metadata, writable: true });
    Object.defineProperty(trackingCode, '_createdAt', { value: new Date(doc.createdAt), writable: false });

    return trackingCode;
  }
}
