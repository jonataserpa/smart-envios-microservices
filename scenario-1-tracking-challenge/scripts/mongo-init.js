// Script de inicialização do MongoDB para o microserviço de rastreamento
print('Inicializando banco de dados de rastreamento...');

// Criar usuário específico para tracking
db = db.getSiblingDB('tracking');

db.createUser({
  user: 'tracking_user',
  pwd: 'tracking_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'tracking'
    }
  ]
});

print('Usuário tracking_user criado com sucesso');

// Criar coleções com esquemas
db.createCollection('tracking_codes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code', 'carrier', 'status', 'isActive'],
      properties: {
        code: {
          bsonType: 'string',
          pattern: '^[A-Z]{2}[0-9]{11}[A-Z]{2}$',
          description: 'Código de rastreamento válido'
        },
        carrier: {
          bsonType: 'string',
          enum: ['Carriers', 'Correios'],
          description: 'Transportadora válida'
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'],
          description: 'Status válido de rastreamento'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Se o código está sendo monitorado'
        }
      }
    }
  }
});

print('Coleção tracking_codes criada com validação');

// Criar índices para performance
db.tracking_codes.createIndex({ code: 1 }, { unique: true });
db.tracking_codes.createIndex({ nextCheckAt: 1, isActive: 1 });
db.tracking_codes.createIndex({ carrier: 1, status: 1 });
db.tracking_codes.createIndex({ customerId: 1 });
db.tracking_codes.createIndex({ createdAt: -1 });

print('Índices criados com sucesso');

// Inserir dados de exemplo para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  db.tracking_codes.insertOne({
    code: 'SM82886187440BM',
    carrier: 'Carriers',
    status: 'pending',
    isActive: true,
    customerId: 'customer_123',
    contractId: 'contract_456',
    createdAt: new Date(),
    lastCheckedAt: new Date(),
    nextCheckAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    checkInterval: 300,
    events: [],
    metadata: {
      errorCount: 0,
      totalChecks: 0,
      origin: 'São Paulo, SP',
      destination: 'Rio de Janeiro, RJ'
    }
  });
  
  print('Dados de exemplo inseridos');
}

print('Inicialização do MongoDB concluída com sucesso!');
