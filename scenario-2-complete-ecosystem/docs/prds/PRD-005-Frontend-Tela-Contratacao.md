# PRD-005: Frontend - Tela de Contratação de Fretes

## Visão Geral

**Objetivo**: Desenvolver interface completa para contratação de fretes, permitindo preenchimento de dados de remetente/destinatário, confirmação de volumes e finalização do pedido com integração ao microserviço de contratação.

**Duração Estimada**: 6-7 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-003 (Tela de Cotação), PRD-006 (Microserviço de Contratação)

## Contexto de Negócio

A tela de contratação é onde o cliente efetiva a compra do frete, sendo crítica para:
- Converter cotações em vendas efetivas
- Coletar dados precisos para entrega
- Validar informações de cobrança
- Gerar documentação necessária
- Proporcionar confiança no processo

## Especificações Técnicas

### 1. Fluxo da Contratação

#### 1.1 Estados da Contratação
```typescript
enum ContractStep {
  QUOTE_REVIEW = 'quote_review',      // Revisão da cotação
  SENDER_DATA = 'sender_data',        // Dados do remetente
  RECIPIENT_DATA = 'recipient_data',  // Dados do destinatário
  VOLUMES_REVIEW = 'volumes_review',  // Revisão dos volumes
  PAYMENT = 'payment',                // Dados de pagamento
  CONFIRMATION = 'confirmation'       // Confirmação final
}

interface ContractState {
  step: ContractStep;
  selectedService: QuoteService;
  senderData: SenderInfo;
  recipientData: RecipientInfo;
  volumes: VolumeInfo[];
  paymentData: PaymentInfo;
  contractId?: string;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
}
```

#### 1.2 Navegação entre Etapas
```typescript
// contexts/ContractContext.tsx
const contractReducer = (state: ContractState, action: ContractAction): ContractState => {
  switch (action.type) {
    case 'GOTO_STEP':
      return { ...state, step: action.payload };
    
    case 'SET_SENDER_DATA':
      return { 
        ...state, 
        senderData: { ...state.senderData, ...action.payload }
      };
    
    case 'SET_RECIPIENT_DATA':
      return { 
        ...state, 
        recipientData: { ...state.recipientData, ...action.payload }
      };
    
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload
      };
    
    case 'SUBMIT_CONTRACT':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case 'CONTRACT_SUCCESS':
      return {
        ...state,
        isLoading: false,
        contractId: action.payload.contractId,
        step: ContractStep.CONFIRMATION
      };
    
    case 'CONTRACT_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    
    default:
      return state;
  }
};
```

### 2. Componentes Principais

#### 2.1 Stepper de Progresso
```typescript
// components/ContractStepper.tsx
interface ContractStepperProps {
  currentStep: ContractStep;
  onStepClick: (step: ContractStep) => void;
  completedSteps: ContractStep[];
}

export const ContractStepper: React.FC<ContractStepperProps> = ({
  currentStep,
  onStepClick,
  completedSteps
}) => {
  const steps = [
    { key: ContractStep.QUOTE_REVIEW, title: 'Revisão', icon: <CheckCircleOutlined /> },
    { key: ContractStep.SENDER_DATA, title: 'Remetente', icon: <UserOutlined /> },
    { key: ContractStep.RECIPIENT_DATA, title: 'Destinatário', icon: <HomeOutlined /> },
    { key: ContractStep.VOLUMES_REVIEW, title: 'Volumes', icon: <BoxPlotOutlined /> },
    { key: ContractStep.PAYMENT, title: 'Pagamento', icon: <CreditCardOutlined /> },
    { key: ContractStep.CONFIRMATION, title: 'Confirmação', icon: <CheckOutlined /> }
  ];
  
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };
  
  return (
    <Card className="contract-stepper">
      <Steps 
        current={getCurrentStepIndex()}
        direction="horizontal"
        size="small"
        onChange={(current) => {
          const targetStep = steps[current];
          if (completedSteps.includes(targetStep.key) || current <= getCurrentStepIndex()) {
            onStepClick(targetStep.key);
          }
        }}
      >
        {steps.map(step => (
          <Step
            key={step.key}
            title={step.title}
            icon={step.icon}
            status={
              completedSteps.includes(step.key) ? 'finish' :
              step.key === currentStep ? 'process' : 'wait'
            }
          />
        ))}
      </Steps>
    </Card>
  );
};
```

#### 2.2 Formulário de Dados do Remetente
```typescript
// pages/ContractPage/components/SenderForm.tsx
interface SenderFormData {
  document: string;
  name: string;
  email: string;
  phone: string;
  zipcode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

const senderFormSchema = z.object({
  document: z
    .string()
    .min(1, 'CPF/CNPJ é obrigatório')
    .refine(validateCPFCNPJ, 'CPF/CNPJ inválido'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z
    .string()
    .email('E-mail inválido'),
  phone: z
    .string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato: (11) 99999-9999'),
  zipcode: z
    .string()
    .regex(/^\d{5}-\d{3}$/, 'CEP deve ter formato 12345-678'),
  street: z.string().min(1, 'Endereço é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
  complement: z.string().optional()
});

export const SenderForm: React.FC = () => {
  const { state, dispatch } = useContract();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<SenderFormData>({
    resolver: zodResolver(senderFormSchema),
    defaultValues: state.senderData
  });
  
  const watchedZipcode = watch('zipcode');
  
  // Auto-complete endereço via CEP
  useEffect(() => {
    if (watchedZipcode && watchedZipcode.length === 9) {
      fetchAddressByCEP(watchedZipcode).then(address => {
        if (address) {
          setValue('street', address.street);
          setValue('neighborhood', address.neighborhood);
          setValue('city', address.city);
          setValue('state', address.state);
        }
      }).catch(console.error);
    }
  }, [watchedZipcode, setValue]);
  
  const onSubmit = (data: SenderFormData) => {
    dispatch({ type: 'SET_SENDER_DATA', payload: data });
    dispatch({ type: 'GOTO_STEP', payload: ContractStep.RECIPIENT_DATA });
  };
  
  return (
    <Card title="Dados do Remetente" className="sender-form">
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Row gutter={16}>
          <Col span={12}>
            <Controller
              name="document"
              control={control}
              render={({ field }) => (
                <Form.Item
                  label="CPF/CNPJ"
                  validateStatus={errors.document ? 'error' : ''}
                  help={errors.document?.message}
                  required
                >
                  <Input
                    {...field}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    onChange={(e) => {
                      const value = formatCPFCNPJ(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </Form.Item>
              )}
            />
          </Col>
          
          <Col span={12}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Form.Item
                  label="Nome completo"
                  validateStatus={errors.name ? 'error' : ''}
                  help={errors.name?.message}
                  required
                >
                  <Input {...field} placeholder="João da Silva" />
                </Form.Item>
              )}
            />
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Form.Item
                  label="E-mail"
                  validateStatus={errors.email ? 'error' : ''}
                  help={errors.email?.message}
                  required
                >
                  <Input {...field} type="email" placeholder="joao@exemplo.com" />
                </Form.Item>
              )}
            />
          </Col>
          
          <Col span={12}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Form.Item
                  label="Telefone"
                  validateStatus={errors.phone ? 'error' : ''}
                  help={errors.phone?.message}
                  required
                >
                  <Input
                    {...field}
                    placeholder="(11) 99999-9999"
                    onChange={(e) => {
                      const value = formatPhone(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </Form.Item>
              )}
            />
          </Col>
        </Row>
        
        <AddressFields control={control} errors={errors} prefix="sender" />
        
        <Form.Item className="form-actions">
          <Space>
            <Button 
              onClick={() => dispatch({ type: 'GOTO_STEP', payload: ContractStep.QUOTE_REVIEW })}
            >
              Voltar
            </Button>
            <Button type="primary" htmlType="submit">
              Próximo: Destinatário
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
```

#### 2.3 Componente Reutilizável de Endereço
```typescript
// components/forms/AddressFields.tsx
interface AddressFieldsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  prefix: string;
  disabled?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({
  control,
  errors,
  prefix,
  disabled = false
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Controller
            name="zipcode"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="CEP"
                validateStatus={errors.zipcode ? 'error' : ''}
                help={errors.zipcode?.message}
                required
              >
                <Input
                  {...field}
                  placeholder="12345-678"
                  disabled={disabled}
                  onChange={(e) => {
                    const value = formatZipCode(e.target.value);
                    field.onChange(value);
                  }}
                />
              </Form.Item>
            )}
          />
        </Col>
        
        <Col span={12}>
          <Controller
            name="street"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Endereço"
                validateStatus={errors.street ? 'error' : ''}
                help={errors.street?.message}
                required
              >
                <Input {...field} placeholder="Rua das Flores" disabled={disabled} />
              </Form.Item>
            )}
          />
        </Col>
        
        <Col span={4}>
          <Controller
            name="number"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Número"
                validateStatus={errors.number ? 'error' : ''}
                help={errors.number?.message}
                required
              >
                <Input {...field} placeholder="123" disabled={disabled} />
              </Form.Item>
            )}
          />
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={8}>
          <Controller
            name="neighborhood"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Bairro"
                validateStatus={errors.neighborhood ? 'error' : ''}
                help={errors.neighborhood?.message}
                required
              >
                <Input {...field} placeholder="Centro" disabled={disabled} />
              </Form.Item>
            )}
          />
        </Col>
        
        <Col span={8}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Cidade"
                validateStatus={errors.city ? 'error' : ''}
                help={errors.city?.message}
                required
              >
                <Input {...field} placeholder="São Paulo" disabled={disabled} />
              </Form.Item>
            )}
          />
        </Col>
        
        <Col span={4}>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Estado"
                validateStatus={errors.state ? 'error' : ''}
                help={errors.state?.message}
                required
              >
                <Select {...field} placeholder="SP" disabled={disabled}>
                  {brazilianStates.map(state => (
                    <Option key={state.code} value={state.code}>
                      {state.code}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          />
        </Col>
        
        <Col span={4}>
          <Controller
            name="complement"
            control={control}
            render={({ field }) => (
              <Form.Item label="Complemento">
                <Input {...field} placeholder="Apto 101" disabled={disabled} />
              </Form.Item>
            )}
          />
        </Col>
      </Row>
    </>
  );
};
```

#### 2.4 Revisão de Volumes
```typescript
// pages/ContractPage/components/VolumesReview.tsx
export const VolumesReview: React.FC = () => {
  const { state, dispatch } = useContract();
  const [editingVolume, setEditingVolume] = useState<string | null>(null);
  
  const handleVolumeUpdate = (volumeId: string, updates: Partial<VolumeInfo>) => {
    dispatch({
      type: 'UPDATE_VOLUME',
      payload: { id: volumeId, updates }
    });
    setEditingVolume(null);
  };
  
  const addVolume = () => {
    const newVolume: VolumeInfo = {
      id: nanoid(),
      quantity: 1,
      weight: 0,
      height: 0,
      width: 0,
      length: 0,
      description: '',
      unitPrice: 0,
      totalPrice: 0
    };
    
    dispatch({ type: 'ADD_VOLUME', payload: newVolume });
  };
  
  const canProceed = state.volumes.length > 0 && 
                    state.volumes.every(v => 
                      v.quantity > 0 && 
                      v.weight > 0 && 
                      v.description.trim() !== ''
                    );
  
  return (
    <Card 
      title="Revisão dos Volumes"
      extra={
        <Button 
          type="dashed" 
          icon={<PlusOutlined />}
          onClick={addVolume}
          disabled={state.volumes.length >= 10}
        >
          Adicionar volume
        </Button>
      }
      className="volumes-review"
    >
      <div className="volumes-review__summary">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="Total de volumes" 
              value={state.volumes.length} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Peso total" 
              value={state.volumes.reduce((sum, v) => sum + (v.weight * v.quantity), 0)} 
              suffix="kg"
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Valor declarado" 
              value={state.volumes.reduce((sum, v) => sum + v.totalPrice, 0)} 
              prefix="R$"
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Frete selecionado" 
              value={state.selectedService?.price || 0} 
              prefix="R$"
              precision={2}
            />
          </Col>
        </Row>
      </div>
      
      <Divider />
      
      <div className="volumes-review__list">
        {state.volumes.map((volume, index) => (
          <VolumeReviewItem
            key={volume.id}
            volume={volume}
            index={index}
            isEditing={editingVolume === volume.id}
            onEdit={() => setEditingVolume(volume.id)}
            onSave={(updates) => handleVolumeUpdate(volume.id, updates)}
            onCancel={() => setEditingVolume(null)}
            onRemove={() => dispatch({ type: 'REMOVE_VOLUME', payload: volume.id })}
            canRemove={state.volumes.length > 1}
          />
        ))}
      </div>
      
      {state.volumes.length === 0 && (
        <Empty
          description="Nenhum volume adicionado"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={addVolume}>
            Adicionar primeiro volume
          </Button>
        </Empty>
      )}
      
      <div className="volumes-review__actions">
        <Space>
          <Button 
            onClick={() => dispatch({ type: 'GOTO_STEP', payload: ContractStep.RECIPIENT_DATA })}
          >
            Voltar
          </Button>
          <Button 
            type="primary" 
            disabled={!canProceed}
            onClick={() => dispatch({ type: 'GOTO_STEP', payload: ContractStep.PAYMENT })}
          >
            Próximo: Pagamento
          </Button>
        </Space>
      </div>
    </Card>
  );
};
```

#### 2.5 Item de Volume Editável
```typescript
// components/VolumeReviewItem.tsx
interface VolumeReviewItemProps {
  volume: VolumeInfo;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<VolumeInfo>) => void;
  onCancel: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const VolumeReviewItem: React.FC<VolumeReviewItemProps> = ({
  volume,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  canRemove
}) => {
  const [editForm] = Form.useForm();
  
  const handleSave = () => {
    editForm.validateFields().then(values => {
      onSave({
        ...values,
        totalPrice: values.unitPrice * values.quantity
      });
    });
  };
  
  if (isEditing) {
    return (
      <Card 
        size="small" 
        className="volume-item volume-item--editing"
        title={`Editando Volume #${index + 1}`}
        extra={
          <Space>
            <Button size="small" onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="small" type="primary" onClick={handleSave}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form
          form={editForm}
          layout="vertical"
          initialValues={volume}
        >
          <Row gutter={16}>
            <Col span={4}>
              <Form.Item
                name="quantity"
                label="Qtd"
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={1} max={100} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="weight"
                label="Peso (kg)"
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={0.1} max={1000} step={0.1} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="height"
                label="Altura (cm)"
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={1} max={200} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="width"
                label="Largura (cm)"
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={1} max={200} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="length"
                label="Comp. (cm)"
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={1} max={200} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="unitPrice"
                label="Valor unit."
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber 
                  min={0} 
                  max={100000} 
                  step={0.01}
                  formatter={value => `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/R\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="Descrição do conteúdo"
            rules={[
              { required: true, message: 'Descrição é obrigatória' },
              { min: 5, message: 'Mínimo 5 caracteres' }
            ]}
          >
            <Input.TextArea 
              rows={2} 
              placeholder="Ex: Camiseta Polo Masculina"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Card>
    );
  }
  
  return (
    <Card 
      size="small" 
      className="volume-item"
      title={`Volume #${index + 1}`}
      extra={
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={onEdit}>
            Editar
          </Button>
          {canRemove && (
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={onRemove}
            >
              Remover
            </Button>
          )}
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={3}>
          <Statistic title="Quantidade" value={volume.quantity} />
        </Col>
        <Col span={4}>
          <Statistic title="Peso" value={volume.weight} suffix="kg" precision={2} />
        </Col>
        <Col span={5}>
          <Statistic 
            title="Dimensões" 
            value={`${volume.height}×${volume.width}×${volume.length}`}
            suffix="cm"
          />
        </Col>
        <Col span={4}>
          <Statistic 
            title="Valor unit." 
            value={volume.unitPrice} 
            prefix="R$" 
            precision={2} 
          />
        </Col>
        <Col span={4}>
          <Statistic 
            title="Valor total" 
            value={volume.totalPrice} 
            prefix="R$" 
            precision={2} 
          />
        </Col>
        <Col span={4}>
          <Text strong>Peso cubado:</Text>
          <br />
          <Text type="secondary">
            {calculateCubicWeight(volume).toFixed(2)} kg
          </Text>
        </Col>
      </Row>
      
      <div className="volume-item__description">
        <Text strong>Conteúdo:</Text>
        <br />
        <Text>{volume.description}</Text>
      </div>
    </Card>
  );
};
```

### 3. Validações e Integrações

#### 3.1 Integração com API de CEP
```typescript
// services/AddressService.ts
export class AddressService {
  private static readonly VIA_CEP_URL = 'https://viacep.com.br/ws';
  
  static async fetchAddressByCEP(cep: string): Promise<AddressInfo | null> {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }
    
    try {
      const response = await axios.get(`${this.VIA_CEP_URL}/${cleanCEP}/json/`, {
        timeout: 5000
      });
      
      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      return {
        street: response.data.logradouro || '',
        neighborhood: response.data.bairro || '',
        city: response.data.localidade || '',
        state: response.data.uf || '',
        cep: response.data.cep || cep
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout na consulta do CEP');
      }
      throw new Error('Erro ao consultar CEP');
    }
  }
  
  static validateCEP(cep: string): boolean {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8 && /^\d{8}$/.test(cleanCEP);
  }
}
```

#### 3.2 Validações de Documentos
```typescript
// utils/documentValidators.ts
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  
  if (firstDigit !== parseInt(cleanCPF[9])) return false;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  
  return secondDigit === parseInt(cleanCPF[10]);
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calcular primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let firstDigit = sum % 11;
  firstDigit = firstDigit < 2 ? 0 : 11 - firstDigit;
  
  if (firstDigit !== parseInt(cleanCNPJ[12])) return false;
  
  // Calcular segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  let secondDigit = sum % 11;
  secondDigit = secondDigit < 2 ? 0 : 11 - secondDigit;
  
  return secondDigit === parseInt(cleanCNPJ[13]);
};

export const validateCPFCNPJ = (document: string): boolean => {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return validateCPF(cleanDoc);
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(cleanDoc);
  }
  
  return false;
};
```

### 4. Confirmação e Finalização

#### 4.1 Tela de Confirmação
```typescript
// pages/ContractPage/components/ContractConfirmation.tsx
export const ContractConfirmation: React.FC = () => {
  const { state, dispatch } = useContract();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    dispatch({ type: 'SUBMIT_CONTRACT' });
    
    try {
      const contractData = {
        quote_service_id: state.selectedService.serviceId,
        customer_id: 'temp_customer_id', // TODO: implementar customer management
        type: 'freight_contract',
        freightContentStatement: {
          documentType: 'NF', // Nota Fiscal
          // Dados do destinatário
          destiny_document: state.recipientData.document,
          destiny_name: state.recipientData.name,
          destiny_email: state.recipientData.email,
          destiny_phone: state.recipientData.phone,
          destiny_zipcode: state.recipientData.zipcode,
          destiny_street: state.recipientData.street,
          destiny_number: state.recipientData.number,
          destiny_neighborhood: state.recipientData.neighborhood,
          destiny_city: state.recipientData.city,
          destiny_complement: state.recipientData.complement || '',
          // Dados do remetente
          sender_document: state.senderData.document,
          sender_name: state.senderData.name,
          sender_email: state.senderData.email,
          sender_phone: state.senderData.phone,
          sender_zipcode: state.senderData.zipcode,
          sender_street: state.senderData.street,
          sender_number: state.senderData.number,
          sender_neighborhood: state.senderData.neighborhood,
          sender_city: state.senderData.city,
          sender_state: state.senderData.state,
          sender_complement: state.senderData.complement || '',
          // Volumes/itens
          items: state.volumes.map(volume => ({
            amount: volume.quantity,
            weight: volume.weight,
            height: volume.height,
            width: volume.width,
            length: volume.length,
            description: volume.description,
            unit_price: volume.unitPrice,
            total_price: volume.totalPrice
          })),
          observation: ''
        }
      };
      
      const response = await contractService.createContract(contractData);
      
      dispatch({ 
        type: 'CONTRACT_SUCCESS', 
        payload: { contractId: response.contractId } 
      });
      
    } catch (error) {
      dispatch({ 
        type: 'CONTRACT_ERROR', 
        payload: error.message 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (state.contractId) {
    return <ContractSuccess contractId={state.contractId} />;
  }
  
  return (
    <div className="contract-confirmation">
      <Card title="Confirmação da Contratação">
        <ContractSummary state={state} />
        
        <Divider />
        
        <div className="contract-confirmation__terms">
          <Checkbox>
            Aceito os{' '}
            <Button type="link" size="small">
              termos e condições
            </Button>
            {' '}do serviço
          </Checkbox>
        </div>
        
        <div className="contract-confirmation__actions">
          <Space>
            <Button 
              size="large"
              onClick={() => dispatch({ type: 'GOTO_STEP', payload: ContractStep.PAYMENT })}
            >
              Voltar
            </Button>
            <Button 
              type="primary" 
              size="large"
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Confirmar Contratação
            </Button>
          </Space>
        </div>
        
        {state.error && (
          <Alert
            type="error"
            message="Erro na contratação"
            description={state.error}
            showIcon
            closable
            onClose={() => dispatch({ type: 'CLEAR_ERROR' })}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
};
```

#### 4.2 Resumo do Contrato
```typescript
// components/ContractSummary.tsx
interface ContractSummaryProps {
  state: ContractState;
}

export const ContractSummary: React.FC<ContractSummaryProps> = ({ state }) => {
  const totalValue = state.volumes.reduce((sum, v) => sum + v.totalPrice, 0);
  const totalWeight = state.volumes.reduce((sum, v) => sum + (v.weight * v.quantity), 0);
  
  return (
    <div className="contract-summary">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="Serviço Selecionado">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Transportadora">
                {state.selectedService.carrierName}
              </Descriptions.Item>
              <Descriptions.Item label="Serviço">
                {state.selectedService.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="Prazo">
                {state.selectedService.estimatedDays} dias úteis
              </Descriptions.Item>
              <Descriptions.Item label="Valor do frete">
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  R$ {state.selectedService.price.toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card size="small" title="Resumo da Carga">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Total de volumes">
                {state.volumes.length}
              </Descriptions.Item>
              <Descriptions.Item label="Peso total">
                {totalWeight.toFixed(2)} kg
              </Descriptions.Item>
              <Descriptions.Item label="Valor declarado">
                R$ {totalValue.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Valor total">
                <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                  R$ {(totalValue + state.selectedService.price).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="Remetente">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Nome">
                {state.senderData.name}
              </Descriptions.Item>
              <Descriptions.Item label="Documento">
                {state.senderData.document}
              </Descriptions.Item>
              <Descriptions.Item label="Endereço">
                {`${state.senderData.street}, ${state.senderData.number}`}
                {state.senderData.complement && `, ${state.senderData.complement}`}
                <br />
                {`${state.senderData.neighborhood}, ${state.senderData.city}/${state.senderData.state}`}
                <br />
                CEP: {state.senderData.zipcode}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card size="small" title="Destinatário">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Nome">
                {state.recipientData.name}
              </Descriptions.Item>
              <Descriptions.Item label="Documento">
                {state.recipientData.document}
              </Descriptions.Item>
              <Descriptions.Item label="Endereço">
                {`${state.recipientData.street}, ${state.recipientData.number}`}
                {state.recipientData.complement && `, ${state.recipientData.complement}`}
                <br />
                {`${state.recipientData.neighborhood}, ${state.recipientData.city}/${state.recipientData.state}`}
                <br />
                CEP: {state.recipientData.zipcode}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

### 5. Estilos e Responsividade

#### 5.1 Estilos da Página de Contratação
```scss
// pages/ContractPage/ContractPage.scss
.contract-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  
  &__content {
    margin-top: var(--spacing-lg);
  }
}

.contract-stepper {
  margin-bottom: var(--spacing-lg);
  
  .ant-steps {
    .ant-steps-item {
      cursor: pointer;
      
      &.ant-steps-item-finish {
        .ant-steps-item-icon {
          background-color: var(--success-color);
          border-color: var(--success-color);
        }
      }
      
      &.ant-steps-item-process {
        .ant-steps-item-icon {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }
      }
    }
  }
}

.sender-form,
.recipient-form {
  .form-actions {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid #e5e7eb;
    text-align: right;
  }
}

.volumes-review {
  &__summary {
    background: #f8fafc;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--spacing-lg);
  }
  
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  &__actions {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid #e5e7eb;
    text-align: right;
  }
}

.volume-item {
  border: 1px solid #e5e7eb;
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
  }
  
  &--editing {
    border-color: var(--warning-color);
    background: #fffbf0;
  }
  
  &__description {
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid #f3f4f6;
  }
}

.contract-confirmation {
  &__terms {
    margin: var(--spacing-lg) 0;
    padding: var(--spacing-md);
    background: #f8fafc;
    border-radius: var(--border-radius-md);
    text-align: center;
  }
  
  &__actions {
    text-align: center;
    margin-top: var(--spacing-lg);
  }
}

.contract-summary {
  .ant-descriptions-item-label {
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .ant-descriptions-item-content {
    color: var(--text-primary);
  }
}

// Responsive
@media (max-width: 768px) {
  .contract-page {
    padding: var(--spacing-md);
  }
  
  .contract-stepper {
    .ant-steps {
      direction: vertical;
    }
  }
  
  .volume-item {
    .ant-col {
      margin-bottom: var(--spacing-sm);
    }
  }
  
  .contract-summary {
    .ant-row {
      .ant-col {
        margin-bottom: var(--spacing-md);
      }
    }
  }
}

@media (max-width: 480px) {
  .contract-stepper {
    .ant-steps {
      .ant-steps-item-title {
        font-size: 12px;
      }
    }
  }
  
  .volume-item {
    .ant-statistic {
      .ant-statistic-title {
        font-size: 11px;
      }
      
      .ant-statistic-content {
        font-size: 14px;
      }
    }
  }
}
```

## Entregáveis

### Fase 1: Estrutura Base (2 dias)
- [ ] Setup do contexto de contratação
- [ ] Stepper de progresso
- [ ] Navegação entre etapas
- [ ] Validações de formulário base

### Fase 2: Formulários (2 dias)
- [ ] Formulário de dados do remetente
- [ ] Formulário de dados do destinatário
- [ ] Integração com API de CEP
- [ ] Validações de documentos

### Fase 3: Volumes e Revisão (2 dias)
- [ ] Tela de revisão de volumes
- [ ] Edição inline de volumes
- [ ] Cálculos de peso cubado
- [ ] Validações de negócio

### Fase 4: Finalização (1 dia)
- [ ] Tela de confirmação
- [ ] Integração com API de contratação
- [ ] Tratamento de erros
- [ ] Feedback de sucesso

## Critérios de Aceitação

1. **Funcionalidade**: Fluxo completo de contratação
2. **Validações**: Todos os campos validados adequadamente
3. **UX**: Navegação intuitiva entre etapas
4. **Performance**: Carregamento rápido entre etapas
5. **Mobile**: Interface responsiva

## Métricas de Sucesso

- **Conversion Rate**: > 80% completam contratação
- **Abandonment Rate**: < 20% abandonam no meio
- **Error Rate**: < 3% de erros de validação
- **Time to Complete**: < 5 minutos média

## Próximos Passos

Após conclusão, seguir para PRD-006: Microserviço de Contratação.

---

**Responsável**: Frontend Team  
**Revisores**: UX Designer, Product Owner  
**Última Atualização**: Janeiro 2025
