import { TrackingCode } from '@domain/entities/TrackingCode';
import { TrackingEvent } from '@domain/entities/TrackingEvent';

describe('TrackingCode', () => {
  it('should create a new tracking code', () => {
    const data = {
      code: 'SM82886187440BM',
      carrier: 'Carriers',
      metadata: {
        customerId: 'customer_123',
        contractId: 'contract_456'
      }
    };

    const trackingCode = TrackingCode.create(data);

    expect(trackingCode).toBeDefined();
    expect(trackingCode.code).toBe('SM82886187440BM');
    expect(trackingCode.carrier).toBe('Carriers');
    expect(trackingCode.status.value).toBe('pending');
    expect(trackingCode.isActive).toBe(true);
  });

  it('should add events and update status', () => {
    const data = {
      code: 'SM82886187440BM',
      carrier: 'Carriers',
      metadata: {}
    };

    const trackingCode = TrackingCode.create(data);
    
    const event = TrackingEvent.create({
      trackingCodeId: trackingCode.id,
      timestamp: new Date(),
      status: 'in_transit',
      location: 'São Paulo, SP',
      description: 'Objeto em trânsito',
      isDelivered: false,
      isException: false
    });

    trackingCode.addEvents([event]);

    expect(trackingCode.events).toHaveLength(1);
    expect(trackingCode.status.value).toBe('in_transit');
  });

  it('should deactivate when delivered', () => {
    const data = {
      code: 'SM82886187440BM',
      carrier: 'Carriers',
      metadata: {}
    };

    const trackingCode = TrackingCode.create(data);
    
    const event = TrackingEvent.create({
      trackingCodeId: trackingCode.id,
      timestamp: new Date(),
      status: 'delivered',
      location: 'Rio de Janeiro, RJ',
      description: 'Objeto entregue',
      isDelivered: true,
      isException: false
    });

    trackingCode.addEvents([event]);

    expect(trackingCode.status.isDelivered()).toBe(true);
    expect(trackingCode.isActive).toBe(false);
  });
});
