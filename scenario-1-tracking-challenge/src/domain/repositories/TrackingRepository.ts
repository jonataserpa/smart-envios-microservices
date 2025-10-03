import { TrackingCode } from '../entities/TrackingCode';
import { TrackingListQuery } from '@shared/types';

export interface TrackingRepository {
  save(tracking: TrackingCode): Promise<TrackingCode>;
  findByCode(code: string): Promise<TrackingCode | null>;
  findById(id: string): Promise<TrackingCode | null>;
  findPendingCodes(limit?: number): Promise<TrackingCode[]>;
  findActiveCodes(limit?: number): Promise<TrackingCode[]>;
  findAllCodes(limit?: number): Promise<TrackingCode[]>;
  findByCustomer(customerId: string): Promise<TrackingCode[]>;
  findByContract(contractId: string): Promise<TrackingCode[]>;
  list(query: TrackingListQuery): Promise<{
    items: TrackingCode[];
    total: number;
  }>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  countByStatus(status: string): Promise<number>;
  recalculateNextCheck(code: string): Promise<TrackingCode>;
}
