# PRD-006: Microserviço de Contratação de Fretes

## Visão Geral

**Objetivo**: Desenvolver microserviço responsável por processar e gerenciar contratos de frete, validando dados, integrando com transportadoras e gerenciando o ciclo de vida completo dos contratos.

**Duração Estimada**: 8-10 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-001 (Infraestrutura), PRD-002 (Cotação), PRD-004 (Rastreamento)

## Contexto de Negócio

O microserviço de contratação é fundamental para:
- Converter cotações em contratos efetivos
- Validar e processar dados de contratação
- Integrar com APIs de transportadoras
- Gerenciar documentação fiscal
- Controlar estados do contrato
- Inicializar rastreamento automático

## Especificações Técnicas

### 1. Arquitetura do Serviço

#### 1.1 Estrutura do Projeto
```
freight-contract-service/
├── src/
│   ├── domain/                    # Domínio de negócio
│   │   ├── entities/             # Entidades principais
│   │   │   ├── Contract.ts
│   │   │   ├── ContractItem.ts
│   │   │   ├── Party.ts          # Remetente/Destinatário
│   │   │   └── DocumentInfo.ts
│   │   ├── repositories/         # Interfaces de repositório
│   │   ├── services/            # Serviços de domínio
│   │   ├── value-objects/       # Objetos de valor
│   │   └── events/              # Eventos de domínio
│   ├── application/             # Casos de uso
│   │   ├── commands/            # Command handlers
│   │   ├── queries/             # Query handlers
│   │   ├── validators/          # Validadores de negócio
│   │   └── workflows/           # Workflows complexos
│   ├── infrastructure/          # Implementações técnicas
│   │   ├── database/            # MongoDB repositories
│   │   ├── carriers/            # Integrações transportadoras
│   │   ├── messaging/           # Kafka producers/consumers
│   │   ├── documents/           # Geração de documentos
│   │   └── external/            # APIs externas
│   ├── presentation/            # Camada de apresentação
│   │   ├── controllers/         # REST controllers
│   │   ├── dtos/               # Request/Response DTOs
│   │   └── middlewares/        # Middlewares
│   └── shared/                  # Utilitários compartilhados
├── tests/                       # Testes completos
├── docs/                        # Documentação específica
└── templates/                   # Templates de documentos
```

#### 1.2 Stack Tecnológica
- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: Express.js + Fastify (híbrido)
- **Database**: MongoDB com transações
- **Cache**: Redis para sessões
- **Messaging**: Kafka para eventos
- **PDF Generation**: Puppeteer ou PDFKit
- **Validation**: Joi + custom validators
- **Testing**: Jest + MongoDB Memory Server

### 2. Modelo de Dados

#### 2.1 Entidades Principais

```typescript
// Contract Entity
interface Contract {
  id: string;
  contractNumber: string; // Número único do contrato
  quoteServiceId: string;
  customerId: string;
  
  // Status e controle
  status: ContractStatus;
  type: ContractType;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  
  // Partes envolvidas
  sender: PartyInfo;
  recipient: PartyInfo;
  
  // Conteúdo do frete
  items: ContractItem[];
  
  // Valores e condições
  pricing: ContractPricing;
  terms: ContractTerms;
  
  // Documentação
  documents: ContractDocument[];
  
  // Tracking
  trackingCode?: string;
  
  // Metadados
  metadata: ContractMetadata;
}

// Contract Status
enum ContractStatus {
  DRAFT = 'draft',                    // Rascunho
  PENDING_VALIDATION = 'pending_validation', // Aguardando validação
  VALIDATED = 'validated',            // Validado
  CONFIRMED = 'confirmed',            // Confirmado
  IN_TRANSIT = 'in_transit',         // Em trânsito
  DELIVERED = 'delivered',           // Entregue
  CANCELLED = 'cancelled',           // Cancelado
  EXPIRED = 'expired'                // Expirado
}

enum ContractType {
  FREIGHT = 'freight',
  FREIGHT_WITH_INSURANCE = 'freight_with_insurance'
}

// Party Info (Remetente/Destinatário)
interface PartyInfo {
  document: string;
  documentType: DocumentType;
  name: string;
  email: string;
  phone: string;
  address: AddressInfo;
}

interface AddressInfo {
  zipcode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Contract Item
interface ContractItem {
  id: string;
  quantity: number;
  description: string;
  weight: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
  value: {
    unitPrice: number;
    totalPrice: number;
  };
  category?: string;
  sku?: string;
}

// Contract Pricing
interface ContractPricing {
  freight: {
    basePrice: number;
    taxes: number;
    additionalFees: number;
    totalFreight: number;
  };
  insurance?: {
    rate: number;
    value: number;
  };
  totalValue: number;
  declaredValue: number;
  currency: string;
}

// Contract Terms
interface ContractTerms {
  estimatedDays: number;
  maxDimensions: {
    height: number;
    width: number;
    length: number;
  };
  maxWeight: number;
  maxValue: number;
  restrictions: string[];
  observations?: string;
}
```

#### 2.2 Schema MongoDB
```javascript
const ContractSchema = new mongoose.Schema({
  contractNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  quoteServiceId: { 
    type: String, 
    required: true,
    index: true 
  },
  customerId: { 
    type: String, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(ContractStatus),
    default: ContractStatus.DRAFT,
    index: true
  },
  type: { 
    type: String, 
    enum: Object.values(ContractType),
    required: true 
  },
  
  // Partes envolvidas
  sender: {
    document: { type: String, required: true },
    documentType: { type: String, enum: ['CPF', 'CNPJ'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      zipcode: { type: String, required: true },
      street: { type: String, required: true },
      number: { type: String, required: true },
      neighborhood: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true, maxlength: 2 },
      complement: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  
  recipient: {
    document: { type: String, required: true },
    documentType: { type: String, enum: ['CPF', 'CNPJ'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      zipcode: { type: String, required: true },
      street: { type: String, required: true },
      number: { type: String, required: true },
      neighborhood: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true, maxlength: 2 },
      complement: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  
  // Itens
  items: [{
    quantity: { type: Number, required: true, min: 1 },
    description: { type: String, required: true },
    weight: { type: Number, required: true, min: 0.1 },
    dimensions: {
      height: { type: Number, required: true, min: 1 },
      width: { type: Number, required: true, min: 1 },
      length: { type: Number, required: true, min: 1 }
    },
    value: {
      unitPrice: { type: Number, required: true, min: 0 },
      totalPrice: { type: Number, required: true, min: 0 }
    },
    category: String,
    sku: String
  }],
  
  // Preços
  pricing: {
    freight: {
      basePrice: { type: Number, required: true },
      taxes: { type: Number, default: 0 },
      additionalFees: { type: Number, default: 0 },
      totalFreight: { type: Number, required: true }
    },
    insurance: {
      rate: Number,
      value: Number
    },
    totalValue: { type: Number, required: true },
    declaredValue: { type: Number, required: true },
    currency: { type: String, default: 'BRL' }
  },
  
  // Termos
  terms: {
    estimatedDays: { type: Number, required: true },
    maxDimensions: {
      height: Number,
      width: Number,
      length: Number
    },
    maxWeight: Number,
    maxValue: Number,
    restrictions: [String],
    observations: String
  },
  
  // Documentos
  documents: [{
    type: { type: String, required: true },
    filename: { type: String, required: true },
    url: String,
    status: { type: String, enum: ['pending', 'generated', 'sent', 'error'] },
    generatedAt: Date,
    sentAt: Date
  }],
  
  // Rastreamento
  trackingCode: String,
  
  // Datas importantes
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
  },
  
  // Metadados
  metadata: {
    source: String,
    userAgent: String,
    ipAddress: String,
    campaign: String,
    integrationVersion: String
  }
}, {
  timestamps: true,
  collection: 'contracts'
});

// Índices para otimização
ContractSchema.index({ status: 1, createdAt: -1 });
ContractSchema.index({ customerId: 1, createdAt: -1 });
ContractSchema.index({ trackingCode: 1 });
ContractSchema.index({ 'sender.document': 1 });
ContractSchema.index({ 'recipient.document': 1 });

// Índice TTL para expiração automática de rascunhos
ContractSchema.index(
  { expiresAt: 1 }, 
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { 
      status: { $in: [ContractStatus.DRAFT, ContractStatus.PENDING_VALIDATION] }
    }
  }
);
```

### 3. Casos de Uso

#### 3.1 Criar Contrato
```typescript
class CreateContractUseCase {
  constructor(
    private contractRepository: ContractRepository,
    private quoteService: QuoteService,
    private validationService: ContractValidationService,
    private eventPublisher: EventPublisher,
    private logger: Logger
  ) {}
  
  async execute(command: CreateContractCommand): Promise<Contract> {
    // 1. Validar comando de entrada
    const validation = await this.validationService.validateCreateCommand(command);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // 2. Verificar se cotação ainda é válida
    const quote = await this.quoteService.getQuote(command.quoteServiceId);
    if (!quote || quote.isExpired()) {
      throw new BusinessRuleError('Cotação expirada ou não encontrada');
    }
    
    // 3. Criar número único do contrato
    const contractNumber = await this.generateContractNumber();
    
    // 4. Criar entidade Contract
    const contract = Contract.create({
      contractNumber,
      quoteServiceId: command.quoteServiceId,
      customerId: command.customerId,
      type: command.type,
      sender: command.freightContentStatement.sender,
      recipient: command.freightContentStatement.recipient,
      items: command.freightContentStatement.items,
      pricing: this.calculatePricing(quote, command.freightContentStatement.items),
      terms: this.extractTermsFromQuote(quote),
      metadata: command.metadata
    });
    
    // 5. Validações de negócio
    await this.validateBusinessRules(contract);
    
    // 6. Salvar no banco
    await this.contractRepository.save(contract);
    
    // 7. Publicar evento
    await this.eventPublisher.publish('contract.created', {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      customerId: contract.customerId,
      status: contract.status
    });
    
    this.logger.info('Contrato criado', {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      customerId: contract.customerId
    });
    
    return contract;
  }
  
  private async generateContractNumber(): Promise<string> {
    const prefix = 'SE'; // SmartEnvios
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Buscar último número sequencial do mês
    const lastContract = await this.contractRepository.findLastContractOfMonth(year, month);
    const nextSequence = lastContract ? lastContract.sequence + 1 : 1;
    
    return `${prefix}${year}${month}${nextSequence.toString().padStart(6, '0')}`;
  }
  
  private calculatePricing(quote: Quote, items: ContractItem[]): ContractPricing {
    const declaredValue = items.reduce((sum, item) => sum + item.value.totalPrice, 0);
    const basePrice = quote.price;
    const taxes = basePrice * 0.15; // 15% de impostos aproximado
    const totalFreight = basePrice + taxes;
    
    return {
      freight: {
        basePrice,
        taxes,
        additionalFees: 0,
        totalFreight
      },
      totalValue: totalFreight,
      declaredValue,
      currency: 'BRL'
    };
  }
  
  private async validateBusinessRules(contract: Contract): Promise<void> {
    const errors: string[] = [];
    
    // Validar peso total
    const totalWeight = contract.items.reduce(
      (sum, item) => sum + (item.weight * item.quantity), 0
    );
    if (totalWeight > 1000) {
      errors.push('Peso total não pode exceder 1000kg');
    }
    
    // Validar valor declarado
    if (contract.pricing.declaredValue > 50000) {
      errors.push('Valor declarado não pode exceder R$ 50.000');
    }
    
    // Validar CEPs válidos
    const validCEPs = await Promise.all([
      this.isValidCEP(contract.sender.address.zipcode),
      this.isValidCEP(contract.recipient.address.zipcode)
    ]);
    
    if (!validCEPs[0]) errors.push('CEP de origem inválido');
    if (!validCEPs[1]) errors.push('CEP de destino inválido');
    
    if (errors.length > 0) {
      throw new BusinessRuleError(errors.join('; '));
    }
  }
}
```

#### 3.2 Confirmar Contrato
```typescript
class ConfirmContractUseCase {
  constructor(
    private contractRepository: ContractRepository,
    private carriersIntegration: CarriersIntegrationService,
    private trackingService: TrackingService,
    private documentService: DocumentGenerationService,
    private eventPublisher: EventPublisher,
    private logger: Logger
  ) {}
  
  async execute(contractId: string): Promise<Contract> {
    // 1. Buscar contrato
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado');
    }
    
    // 2. Validar se pode ser confirmado
    if (contract.status !== ContractStatus.VALIDATED) {
      throw new BusinessRuleError('Contrato deve estar validado para ser confirmado');
    }
    
    try {
      // 3. Criar pedido na transportadora
      const carrierOrder = await this.carriersIntegration.createShipment(contract);
      
      // 4. Atualizar contrato com dados da transportadora
      contract.trackingCode = carrierOrder.trackingCode;
      contract.status = ContractStatus.CONFIRMED;
      
      // 5. Adicionar à lista de rastreamento
      if (contract.trackingCode) {
        await this.trackingService.addTrackingCode({
          code: contract.trackingCode,
          carrier: 'Carriers',
          customerReference: contract.contractNumber,
          metadata: {
            contractId: contract.id,
            origin: contract.sender.address.zipcode,
            destination: contract.recipient.address.zipcode
          }
        });
      }
      
      // 6. Gerar documentos
      await this.documentService.generateContractDocuments(contract);
      
      // 7. Salvar alterações
      await this.contractRepository.save(contract);
      
      // 8. Publicar eventos
      await Promise.all([
        this.eventPublisher.publish('contract.confirmed', {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          trackingCode: contract.trackingCode,
          customerId: contract.customerId
        }),
        this.eventPublisher.publish('tracking.initiated', {
          contractId: contract.id,
          trackingCode: contract.trackingCode
        })
      ]);
      
      this.logger.info('Contrato confirmado', {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        trackingCode: contract.trackingCode
      });
      
      return contract;
      
    } catch (error) {
      // Reverter status em caso de erro
      contract.status = ContractStatus.VALIDATED;
      await this.contractRepository.save(contract);
      
      await this.eventPublisher.publish('contract.confirmation.failed', {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        error: error.message
      });
      
      throw new ContractConfirmationError(
        'Falha ao confirmar contrato na transportadora',
        error
      );
    }
  }
}
```

### 4. Integração com Transportadoras

#### 4.1 Serviço de Integração Carriers
```typescript
class CarriersIntegrationService {
  private readonly client: CarriersApiClient;
  private readonly mapper: CarriersContractMapper;
  
  constructor(
    client: CarriersApiClient,
    mapper: CarriersContractMapper,
    logger: Logger
  ) {
    this.client = client;
    this.mapper = mapper;
  }
  
  async createShipment(contract: Contract): Promise<CarrierShipmentResponse> {
    // 1. Mapear dados do contrato para formato da Carriers
    const shipmentRequest = this.mapper.contractToShipmentRequest(contract);
    
    // 2. Validar dados antes de enviar
    const validation = this.validateShipmentRequest(shipmentRequest);
    if (!validation.isValid) {
      throw new ValidationError(`Dados inválidos para Carriers: ${validation.errors.join(', ')}`);
    }
    
    // 3. Enviar para API da Carriers
    try {
      const response = await this.client.createShipment(shipmentRequest);
      
      // 4. Validar resposta
      if (!response.success || !response.trackingCode) {
        throw new CarriersApiError('Resposta inválida da Carriers API');
      }
      
      return {
        trackingCode: response.trackingCode,
        carrierOrderId: response.orderId,
        estimatedDelivery: response.estimatedDelivery,
        labelUrl: response.labelUrl,
        invoiceUrl: response.invoiceUrl
      };
      
    } catch (error) {
      if (error instanceof CarriersApiError) {
        throw error;
      }
      
      throw new CarriersApiError('Erro na comunicação com Carriers API', error);
    }
  }
  
  private validateShipmentRequest(request: CarriersShipmentRequest): ValidationResult {
    const errors: string[] = [];
    
    // Validar documentos
    if (!this.isValidDocument(request.sender.document)) {
      errors.push('Documento do remetente inválido');
    }
    if (!this.isValidDocument(request.recipient.document)) {
      errors.push('Documento do destinatário inválido');
    }
    
    // Validar endereços
    if (!this.isValidZipCode(request.sender.zipcode)) {
      errors.push('CEP do remetente inválido');
    }
    if (!this.isValidZipCode(request.recipient.zipcode)) {
      errors.push('CEP do destinatário inválido');
    }
    
    // Validar itens
    if (!request.items || request.items.length === 0) {
      errors.push('Deve haver pelo menos um item');
    }
    
    request.items?.forEach((item, index) => {
      if (item.weight <= 0) {
        errors.push(`Item ${index + 1}: peso deve ser maior que zero`);
      }
      if (item.value <= 0) {
        errors.push(`Item ${index + 1}: valor deve ser maior que zero`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### 4.2 Mapeamento de Dados
```typescript
class CarriersContractMapper {
  static contractToShipmentRequest(contract: Contract): CarriersShipmentRequest {
    return {
      // Dados básicos
      serviceType: 'express', // Baseado no tipo de serviço cotado
      
      // Remetente
      sender: {
        document: contract.sender.document,
        documentType: contract.sender.documentType,
        name: contract.sender.name,
        email: contract.sender.email,
        phone: contract.sender.phone,
        zipcode: contract.sender.address.zipcode,
        street: contract.sender.address.street,
        number: contract.sender.address.number,
        neighborhood: contract.sender.address.neighborhood,
        city: contract.sender.address.city,
        state: contract.sender.address.state,
        complement: contract.sender.address.complement || ''
      },
      
      // Destinatário
      recipient: {
        document: contract.recipient.document,
        documentType: contract.recipient.documentType,
        name: contract.recipient.name,
        email: contract.recipient.email,
        phone: contract.recipient.phone,
        zipcode: contract.recipient.address.zipcode,
        street: contract.recipient.address.street,
        number: contract.recipient.address.number,
        neighborhood: contract.recipient.address.neighborhood,
        city: contract.recipient.address.city,
        state: contract.recipient.address.state,
        complement: contract.recipient.address.complement || ''
      },
      
      // Itens
      items: contract.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        weight: item.weight,
        height: item.dimensions.height,
        width: item.dimensions.width,
        length: item.dimensions.length,
        unitValue: item.value.unitPrice,
        totalValue: item.value.totalPrice,
        category: item.category || 'general'
      })),
      
      // Valores
      declaredValue: contract.pricing.declaredValue,
      freight: contract.pricing.freight.totalFreight,
      
      // Metadados
      customerReference: contract.contractNumber,
      observations: contract.terms.observations || ''
    };
  }
  
  static shipmentResponseToContract(
    response: CarriersShipmentResponse
  ): Partial<Contract> {
    return {
      trackingCode: response.trackingCode,
      documents: [
        {
          type: 'shipping_label',
          filename: `label_${response.trackingCode}.pdf`,
          url: response.labelUrl,
          status: 'generated',
          generatedAt: new Date()
        },
        {
          type: 'invoice',
          filename: `invoice_${response.trackingCode}.pdf`,
          url: response.invoiceUrl,
          status: 'generated',
          generatedAt: new Date()
        }
      ]
    };
  }
}
```

### 5. Geração de Documentos

#### 5.1 Serviço de Documentos
```typescript
class DocumentGenerationService {
  constructor(
    private pdfGenerator: PDFGenerator,
    private templateEngine: TemplateEngine,
    private storageService: StorageService,
    private logger: Logger
  ) {}
  
  async generateContractDocuments(contract: Contract): Promise<ContractDocument[]> {
    const documents: ContractDocument[] = [];
    
    try {
      // 1. Gerar contrato de frete
      const contractPdf = await this.generateContractPDF(contract);
      documents.push(contractPdf);
      
      // 2. Gerar declaração de conteúdo
      const contentDeclaration = await this.generateContentDeclarationPDF(contract);
      documents.push(contentDeclaration);
      
      // 3. Gerar recibo de contratação
      const receipt = await this.generateReceiptPDF(contract);
      documents.push(receipt);
      
      // 4. Salvar documentos no contrato
      contract.documents.push(...documents);
      
      this.logger.info('Documentos gerados', {
        contractId: contract.id,
        documentsCount: documents.length
      });
      
      return documents;
      
    } catch (error) {
      this.logger.error('Erro ao gerar documentos', {
        contractId: contract.id,
        error: error.message
      });
      throw new DocumentGenerationError('Falha na geração de documentos', error);
    }
  }
  
  private async generateContractPDF(contract: Contract): Promise<ContractDocument> {
    const templateData = {
      contract,
      generatedAt: new Date(),
      terms: this.getContractTerms(),
      qrCode: this.generateQRCode(contract.contractNumber)
    };
    
    const html = await this.templateEngine.render('contract-template.hbs', templateData);
    const pdfBuffer = await this.pdfGenerator.generateFromHTML(html, {
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });
    
    const filename = `contrato_${contract.contractNumber}.pdf`;
    const url = await this.storageService.upload(pdfBuffer, filename);
    
    return {
      type: 'contract',
      filename,
      url,
      status: 'generated',
      generatedAt: new Date()
    };
  }
  
  private async generateContentDeclarationPDF(contract: Contract): Promise<ContractDocument> {
    const templateData = {
      contract,
      items: contract.items,
      totalWeight: contract.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
      totalValue: contract.pricing.declaredValue,
      generatedAt: new Date()
    };
    
    const html = await this.templateEngine.render('content-declaration-template.hbs', templateData);
    const pdfBuffer = await this.pdfGenerator.generateFromHTML(html);
    
    const filename = `declaracao_conteudo_${contract.contractNumber}.pdf`;
    const url = await this.storageService.upload(pdfBuffer, filename);
    
    return {
      type: 'content_declaration',
      filename,
      url,
      status: 'generated',
      generatedAt: new Date()
    };
  }
  
  private generateQRCode(contractNumber: string): string {
    // Gerar QR Code com link para rastreamento
    const trackingUrl = `${process.env.FRONTEND_URL}/rastreamento?contrato=${contractNumber}`;
    return QRCode.toDataURL(trackingUrl);
  }
}
```

### 6. APIs e Endpoints

#### 6.1 Controller Principal
```typescript
@Controller('/api/v1/contracts')
export class ContractController {
  constructor(
    private createContractUseCase: CreateContractUseCase,
    private confirmContractUseCase: ConfirmContractUseCase,
    private getContractUseCase: GetContractUseCase,
    private updateContractUseCase: UpdateContractUseCase,
    private cancelContractUseCase: CancelContractUseCase
  ) {}
  
  @Post('/')
  @ValidateBody(CreateContractSchema)
  async createContract(@Body() body: CreateContractRequest): Promise<ApiResponse<ContractResponse>> {
    try {
      const contract = await this.createContractUseCase.execute({
        quoteServiceId: body.quote_service_id,
        customerId: body.customer_id,
        type: body.type as ContractType,
        freightContentStatement: body.freightContentStatement,
        metadata: this.extractMetadata(body)
      });
      
      return {
        success: true,
        data: ContractMapper.toResponse(contract),
        message: 'Contrato criado com sucesso'
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof BusinessRuleError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Get('/:id')
  async getContract(@Param('id') id: string): Promise<ApiResponse<ContractDetailResponse>> {
    try {
      const contract = await this.getContractUseCase.execute(id);
      
      return {
        success: true,
        data: ContractMapper.toDetailResponse(contract)
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Post('/:id/confirm')
  async confirmContract(@Param('id') id: string): Promise<ApiResponse<ContractResponse>> {
    try {
      const contract = await this.confirmContractUseCase.execute(id);
      
      return {
        success: true,
        data: ContractMapper.toResponse(contract),
        message: 'Contrato confirmado com sucesso'
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BusinessRuleError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof ContractConfirmationError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Put('/:id')
  @ValidateBody(UpdateContractSchema)
  async updateContract(
    @Param('id') id: string,
    @Body() body: UpdateContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    try {
      const contract = await this.updateContractUseCase.execute(id, body);
      
      return {
        success: true,
        data: ContractMapper.toResponse(contract),
        message: 'Contrato atualizado com sucesso'
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BusinessRuleError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Delete('/:id')
  async cancelContract(@Param('id') id: string): Promise<ApiResponse<void>> {
    try {
      await this.cancelContractUseCase.execute(id);
      
      return {
        success: true,
        message: 'Contrato cancelado com sucesso'
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BusinessRuleError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
  
  @Get('/')
  async listContracts(@Query() query: ListContractsQuery): Promise<ApiResponse<PaginatedResponse<ContractResponse>>> {
    try {
      const result = await this.listContractsUseCase.execute({
        customerId: query.customerId,
        status: query.status,
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc'
      });
      
      return {
        success: true,
        data: {
          items: result.items.map(ContractMapper.toResponse),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
}
```

### 7. Monitoramento e Métricas

#### 7.1 Métricas de Negócio
```typescript
class ContractMetrics {
  private readonly contractsCreatedTotal = new Counter({
    name: 'contracts_created_total',
    help: 'Total number of contracts created',
    labelNames: ['type', 'status', 'customer_segment']
  });
  
  private readonly contractConfirmationDuration = new Histogram({
    name: 'contract_confirmation_duration_seconds',
    help: 'Time taken to confirm contract with carrier',
    labelNames: ['carrier', 'success'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  });
  
  private readonly contractValueDistribution = new Histogram({
    name: 'contract_value_distribution',
    help: 'Distribution of contract values',
    labelNames: ['type'],
    buckets: [10, 50, 100, 500, 1000, 5000, 10000]
  });
  
  private readonly activeContractsGauge = new Gauge({
    name: 'contracts_active_total',
    help: 'Number of active contracts by status',
    labelNames: ['status']
  });
  
  recordContractCreated(contract: Contract): void {
    this.contractsCreatedTotal.inc({
      type: contract.type,
      status: contract.status,
      customer_segment: this.getCustomerSegment(contract.customerId)
    });
    
    this.contractValueDistribution.observe(
      { type: contract.type },
      contract.pricing.totalValue
    );
  }
  
  recordConfirmationDuration(carrier: string, success: boolean, duration: number): void {
    this.contractConfirmationDuration.observe(
      { carrier, success: success.toString() },
      duration
    );
  }
  
  updateActiveContracts(status: string, count: number): void {
    this.activeContractsGauge.set({ status }, count);
  }
  
  private getCustomerSegment(customerId: string): string {
    // Implementar lógica de segmentação
    return 'standard'; // placeholder
  }
}
```

### 8. Workflows e Estados

#### 8.1 State Machine do Contrato
```typescript
class ContractStateMachine {
  private static readonly transitions: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.DRAFT]: [
      ContractStatus.PENDING_VALIDATION,
      ContractStatus.CANCELLED,
      ContractStatus.EXPIRED
    ],
    [ContractStatus.PENDING_VALIDATION]: [
      ContractStatus.VALIDATED,
      ContractStatus.CANCELLED,
      ContractStatus.EXPIRED
    ],
    [ContractStatus.VALIDATED]: [
      ContractStatus.CONFIRMED,
      ContractStatus.CANCELLED,
      ContractStatus.EXPIRED
    ],
    [ContractStatus.CONFIRMED]: [
      ContractStatus.IN_TRANSIT,
      ContractStatus.CANCELLED
    ],
    [ContractStatus.IN_TRANSIT]: [
      ContractStatus.DELIVERED,
      ContractStatus.CANCELLED
    ],
    [ContractStatus.DELIVERED]: [], // Estado final
    [ContractStatus.CANCELLED]: [], // Estado final
    [ContractStatus.EXPIRED]: []    // Estado final
  };
  
  static canTransition(from: ContractStatus, to: ContractStatus): boolean {
    return this.transitions[from]?.includes(to) || false;
  }
  
  static getValidTransitions(currentStatus: ContractStatus): ContractStatus[] {
    return this.transitions[currentStatus] || [];
  }
  
  static isValidTransition(from: ContractStatus, to: ContractStatus): ValidationResult {
    if (this.canTransition(from, to)) {
      return { isValid: true, errors: [] };
    }
    
    return {
      isValid: false,
      errors: [`Transição inválida de ${from} para ${to}`]
    };
  }
}
```

## Entregáveis

### Fase 1: Core Domain (3 dias)
- [ ] Entidades e Value Objects
- [ ] Repositórios e schemas
- [ ] Validações de negócio
- [ ] State machine de contratos

### Fase 2: Use Cases (3 dias)
- [ ] Criar contrato
- [ ] Validar contrato
- [ ] Confirmar contrato
- [ ] Cancelar contrato
- [ ] Listar contratos

### Fase 3: Integrações (2 dias)
- [ ] Integração Carriers API
- [ ] Serviço de documentos
- [ ] Integração com rastreamento
- [ ] Event publishing

### Fase 4: APIs e Qualidade (2 dias)
- [ ] REST endpoints completos
- [ ] Validações de entrada
- [ ] Testes unitários e integração
- [ ] Métricas e monitoramento

## Critérios de Aceitação

1. **Funcionalidade**: CRUD completo de contratos
2. **Integração**: Comunicação com Carriers API
3. **Documentos**: Geração automática de PDFs
4. **Rastreamento**: Integração automática
5. **Qualidade**: Cobertura de testes > 85%

## Métricas de Sucesso

- **Success Rate**: > 98% de contratos confirmados
- **Response Time**: < 2s para criação
- **Integration Time**: < 5s para confirmação
- **Error Rate**: < 2% de falhas de integração

## Próximos Passos

Após conclusão, seguir para PRD-007: API Gateway e Integração.

---

**Responsável**: Backend Team  
**Revisores**: Tech Lead, Product Owner  
**Última Atualização**: Janeiro 2025
