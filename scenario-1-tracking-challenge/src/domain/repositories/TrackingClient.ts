import { CarriersResponse } from '@shared/types';

export interface TrackingClient {
  trackShipment(trackingCode: string): Promise<CarriersResponse>;
  healthCheck(): Promise<boolean>;
}
