# PRD-003: Frontend - Tela de Cotação de Fretes

## Visão Geral

**Objetivo**: Desenvolver interface moderna e intuitiva para cotação de fretes, seguindo o design do Figma e oferecendo excelente experiência do usuário com validações em tempo real e feedback visual.

**Duração Estimada**: 5-6 dias úteis  
**Prioridade**: Alta  
**Dependências**: PRD-002 (Microserviço de Cotação)

## Contexto de Negócio

A tela de cotação é o primeiro ponto de contato do cliente com o sistema SmartEnvios. Deve ser:
- **Intuitiva**: Fácil de usar mesmo para novos usuários
- **Rápida**: Feedback imediato nas interações
- **Responsiva**: Funcionar em desktop, tablet e mobile
- **Acessível**: Seguir padrões de acessibilidade
- **Confiável**: Validações claras e mensagens úteis

## Especificações Técnicas

### 1. Arquitetura Frontend

#### 1.1 Estrutura do Projeto
```
frontend/
├── public/                  # Assets estáticos
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── common/        # Componentes genéricos
│   │   ├── forms/         # Componentes de formulário
│   │   └── ui/           # Elementos de interface
│   ├── pages/             # Páginas da aplicação
│   │   ├── QuotePage/    # Tela de cotação
│   │   └── ContractPage/ # Tela de contratação
│   ├── contexts/          # Context API
│   ├── hooks/            # Custom hooks
│   ├── services/         # APIs e integrações
│   ├── utils/            # Utilitários
│   ├── styles/           # Estilos globais
│   └── types/           # TypeScript definitions
├── tests/                # Testes
└── docs/                # Documentação específica
```

#### 1.2 Stack Tecnológica
- **Framework**: React 18+ com TypeScript
- **Bundler**: Vite para desenvolvimento rápido
- **UI Library**: Ant Design v5
- **Styling**: SASS/SCSS + CSS Modules
- **State Management**: Context API + useReducer
- **Form Management**: React Hook Form + Zod
- **HTTP Client**: Axios com interceptors
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright

### 2. Design System e Componentes

#### 2.1 Configuração do Ant Design
```typescript
// theme.config.ts
import { ConfigProvider, theme } from 'antd';

export const customTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#6366f1', // SmartEnvios brand color
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Form: {
      labelFontSize: 14,
      labelColor: '#374151',
    },
  },
};
```

#### 2.2 Componentes Base
```typescript
// components/common/Logo.tsx
interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', variant = 'full' }) => {
  return (
    <div className={`logo logo--${size} logo--${variant}`}>
      <img src="/logo.svg" alt="SmartEnvios" />
      {variant === 'full' && <span>SmartEnvios</span>}
    </div>
  );
};

// components/common/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <header className="page-header">
      <div className="page-header__content">
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="page-header__action">{action}</div>}
      </div>
    </header>
  );
};
```

### 3. Contexto de Estado Global

#### 3.1 Quote Context
```typescript
// contexts/QuoteContext.tsx
interface Volume {
  id: string;
  quantity: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  price: number;
}

interface QuoteService {
  serviceId: string;
  carrierName: string;
  serviceName: string;
  price: number;
  estimatedDays: number;
  additionalInfo?: string;
}

interface QuoteState {
  // Form data
  zipCodeStart: string;
  zipCodeEnd: string;
  volumes: Volume[];
  totalAmount: number;
  
  // Results
  services: QuoteService[];
  selectedService: QuoteService | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  step: 'form' | 'results' | 'contract';
}

type QuoteAction = 
  | { type: 'SET_ZIP_CODES'; payload: { start: string; end: string } }
  | { type: 'ADD_VOLUME'; payload: Volume }
  | { type: 'UPDATE_VOLUME'; payload: { id: string; volume: Partial<Volume> } }
  | { type: 'REMOVE_VOLUME'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SERVICES'; payload: QuoteService[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_SERVICE'; payload: QuoteService }
  | { type: 'RESET_QUOTE' }
  | { type: 'GOTO_STEP'; payload: QuoteState['step'] };

const quoteReducer = (state: QuoteState, action: QuoteAction): QuoteState => {
  switch (action.type) {
    case 'SET_ZIP_CODES':
      return { 
        ...state, 
        zipCodeStart: action.payload.start,
        zipCodeEnd: action.payload.end 
      };
    
    case 'ADD_VOLUME':
      return {
        ...state,
        volumes: [...state.volumes, action.payload],
        totalAmount: calculateTotalAmount([...state.volumes, action.payload])
      };
    
    case 'SET_SERVICES':
      return {
        ...state,
        services: action.payload,
        isLoading: false,
        error: null,
        step: 'results'
      };
    
    // ... outros cases
    
    default:
      return state;
  }
};

export const QuoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(quoteReducer, initialState);
  
  const calculateQuote = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await quoteService.calculate({
        zip_code_start: state.zipCodeStart,
        zip_code_end: state.zipCodeEnd,
        volumes: state.volumes,
        amount: state.totalAmount
      });
      
      dispatch({ type: 'SET_SERVICES', payload: response.data.services });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [state.zipCodeStart, state.zipCodeEnd, state.volumes, state.totalAmount]);
  
  return (
    <QuoteContext.Provider value={{ state, dispatch, calculateQuote }}>
      {children}
    </QuoteContext.Provider>
  );
};
```

### 4. Formulário de Cotação

#### 4.1 Componente Principal
```typescript
// pages/QuotePage/QuotePage.tsx
import { useQuote } from '../../contexts/QuoteContext';
import { ZipCodeForm } from './components/ZipCodeForm';
import { VolumeForm } from './components/VolumeForm';
import { QuoteResults } from './components/QuoteResults';

export const QuotePage: React.FC = () => {
  const { state } = useQuote();
  
  return (
    <div className="quote-page">
      <PageHeader 
        title="Cotação de frete"
        subtitle="Informe os dados para calcular o melhor frete"
      />
      
      <div className="quote-page__content">
        {state.step === 'form' && (
          <>
            <ZipCodeForm />
            <VolumeForm />
          </>
        )}
        
        {state.step === 'results' && <QuoteResults />}
      </div>
    </div>
  );
};
```

#### 4.2 Formulário de CEPs
```typescript
// pages/QuotePage/components/ZipCodeForm.tsx
interface ZipCodeFormData {
  zipCodeStart: string;
  zipCodeEnd: string;
}

const zipCodeSchema = z.object({
  zipCodeStart: z
    .string()
    .min(1, 'CEP de origem é obrigatório')
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato 12345-678'),
  zipCodeEnd: z
    .string()
    .min(1, 'CEP de destino é obrigatório')
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato 12345-678')
});

export const ZipCodeForm: React.FC = () => {
  const { state, dispatch } = useQuote();
  const { control, handleSubmit, watch, formState: { errors } } = useForm<ZipCodeFormData>({
    resolver: zodResolver(zipCodeSchema),
    defaultValues: {
      zipCodeStart: state.zipCodeStart,
      zipCodeEnd: state.zipCodeEnd
    }
  });
  
  const watchedValues = watch();
  
  // Auto-save form data to context
  useEffect(() => {
    if (watchedValues.zipCodeStart && watchedValues.zipCodeEnd) {
      dispatch({
        type: 'SET_ZIP_CODES',
        payload: {
          start: watchedValues.zipCodeStart,
          end: watchedValues.zipCodeEnd
        }
      });
    }
  }, [watchedValues, dispatch]);
  
  return (
    <Card title="Origem e Destino" className="zip-code-form">
      <Row gutter={16}>
        <Col span={12}>
          <Controller
            name="zipCodeStart"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Seu CEP"
                validateStatus={errors.zipCodeStart ? 'error' : ''}
                help={errors.zipCodeStart?.message}
                required
              >
                <Input
                  {...field}
                  placeholder="38280-000"
                  maxLength={9}
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
            name="zipCodeEnd"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="CEP do comprador"
                validateStatus={errors.zipCodeEnd ? 'error' : ''}
                help={errors.zipCodeEnd?.message}
                required
              >
                <Input
                  {...field}
                  placeholder="38280-000"
                  maxLength={9}
                  onChange={(e) => {
                    const value = formatZipCode(e.target.value);
                    field.onChange(value);
                  }}
                />
              </Form.Item>
            )}
          />
        </Col>
      </Row>
    </Card>
  );
};
```

#### 4.3 Formulário de Volumes
```typescript
// pages/QuotePage/components/VolumeForm.tsx
export const VolumeForm: React.FC = () => {
  const { state, dispatch, calculateQuote } = useQuote();
  
  const addVolume = () => {
    const newVolume: Volume = {
      id: nanoid(),
      quantity: 1,
      weight: 0,
      height: 0,
      width: 0,
      length: 0,
      price: 0
    };
    
    dispatch({ type: 'ADD_VOLUME', payload: newVolume });
  };
  
  const removeVolume = (id: string) => {
    dispatch({ type: 'REMOVE_VOLUME', payload: id });
  };
  
  const canCalculate = state.zipCodeStart && 
                      state.zipCodeEnd && 
                      state.volumes.length > 0 &&
                      state.volumes.every(v => v.quantity > 0 && v.weight > 0);
  
  return (
    <Card 
      title="Volumes"
      extra={
        <Button 
          type="link" 
          icon={<PlusOutlined />}
          onClick={addVolume}
          disabled={state.volumes.length >= 10}
        >
          Adicionar volume
        </Button>
      }
      className="volume-form"
    >
      <div className="volume-form__list">
        {state.volumes.map((volume, index) => (
          <VolumeItem
            key={volume.id}
            volume={volume}
            index={index}
            onUpdate={(updatedVolume) =>
              dispatch({
                type: 'UPDATE_VOLUME',
                payload: { id: volume.id, volume: updatedVolume }
              })
            }
            onRemove={() => removeVolume(volume.id)}
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
      
      <div className="volume-form__actions">
        <Button
          type="primary"
          size="large"
          loading={state.isLoading}
          disabled={!canCalculate}
          onClick={calculateQuote}
          block
        >
          Realizar cotação
        </Button>
      </div>
      
      {state.error && (
        <Alert
          type="error"
          message="Erro ao calcular cotação"
          description={state.error}
          showIcon
          closable
          onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
        />
      )}
    </Card>
  );
};
```

#### 4.4 Item de Volume
```typescript
// pages/QuotePage/components/VolumeItem.tsx
interface VolumeItemProps {
  volume: Volume;
  index: number;
  onUpdate: (volume: Partial<Volume>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const VolumeItem: React.FC<VolumeItemProps> = ({
  volume,
  index,
  onUpdate,
  onRemove,
  canRemove
}) => {
  const [localVolume, setLocalVolume] = useState(volume);
  
  // Debounce updates to context
  const debouncedUpdate = useMemo(
    () => debounce((updatedVolume: Partial<Volume>) => {
      onUpdate(updatedVolume);
    }, 300),
    [onUpdate]
  );
  
  const handleChange = (field: keyof Volume, value: number) => {
    const updated = { ...localVolume, [field]: value };
    setLocalVolume(updated);
    debouncedUpdate(updated);
  };
  
  return (
    <div className="volume-item">
      <div className="volume-item__header">
        <h4>Volume #{index + 1}</h4>
        {canRemove && (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={onRemove}
          />
        )}
      </div>
      
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Quantidade" required>
            <InputNumber
              min={1}
              max={100}
              value={localVolume.quantity}
              onChange={(value) => handleChange('quantity', value || 1)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        
        <Col span={6}>
          <Form.Item label="Peso (kg)" required>
            <InputNumber
              min={0.1}
              max={1000}
              step={0.1}
              value={localVolume.weight}
              onChange={(value) => handleChange('weight', value || 0)}
              style={{ width: '100%' }}
              addonAfter="kg"
            />
          </Form.Item>
        </Col>
        
        <Col span={6}>
          <Form.Item label="Valor total da nota" required>
            <InputNumber
              min={0}
              max={100000}
              step={0.01}
              value={localVolume.price}
              onChange={(value) => handleChange('price', value || 0)}
              style={{ width: '100%' }}
              formatter={value => `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/R\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Altura (cm)" required>
            <InputNumber
              min={1}
              max={200}
              value={localVolume.height}
              onChange={(value) => handleChange('height', value || 0)}
              style={{ width: '100%' }}
              addonAfter="cm"
            />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item label="Largura (cm)" required>
            <InputNumber
              min={1}
              max={200}
              value={localVolume.width}
              onChange={(value) => handleChange('width', value || 0)}
              style={{ width: '100%' }}
              addonAfter="cm"
            />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item label="Comprimento (cm)" required>
            <InputNumber
              min={1}
              max={200}
              value={localVolume.length}
              onChange={(value) => handleChange('length', value || 0)}
              style={{ width: '100%' }}
              addonAfter="cm"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};
```

### 5. Resultados da Cotação

#### 5.1 Lista de Serviços
```typescript
// pages/QuotePage/components/QuoteResults.tsx
export const QuoteResults: React.FC = () => {
  const { state, dispatch } = useQuote();
  
  const handleServiceSelect = (service: QuoteService) => {
    dispatch({ type: 'SELECT_SERVICE', payload: service });
    dispatch({ type: 'GOTO_STEP', payload: 'contract' });
  };
  
  const handleNewQuote = () => {
    dispatch({ type: 'RESET_QUOTE' });
  };
  
  return (
    <div className="quote-results">
      <Card
        title="Resultados da cotação"
        extra={
          <Button onClick={handleNewQuote}>
            Nova cotação
          </Button>
        }
      >
        <div className="quote-results__summary">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Origem" value={state.zipCodeStart} />
            </Col>
            <Col span={8}>
              <Statistic title="Destino" value={state.zipCodeEnd} />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Volumes" 
                value={state.volumes.length} 
                suffix="volume(s)"
              />
            </Col>
          </Row>
        </div>
        
        <Divider />
        
        <div className="quote-results__services">
          {state.services.length === 0 ? (
            <Empty
              description="Nenhum serviço disponível para esta rota"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={state.services}
              renderItem={(service) => (
                <ServiceCard
                  service={service}
                  onSelect={() => handleServiceSelect(service)}
                />
              )}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

// components/ServiceCard.tsx
interface ServiceCardProps {
  service: QuoteService;
  onSelect: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onSelect }) => {
  return (
    <List.Item>
      <Card
        className="service-card"
        hoverable
        onClick={onSelect}
        actions={[
          <Button type="primary" key="select">
            Selecionar
          </Button>
        ]}
      >
        <div className="service-card__header">
          <div className="service-card__carrier">
            <Avatar 
              src={`/carriers/${service.carrierName.toLowerCase()}.png`}
              alt={service.carrierName}
            />
            <span>{service.carrierName}</span>
          </div>
          <div className="service-card__price">
            <Text type="secondary">Valor</Text>
            <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
              R$ {service.price.toFixed(2)}
            </Text>
          </div>
        </div>
        
        <div className="service-card__content">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>{service.serviceName}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                Prazo: {service.estimatedDays} dias úteis
              </Text>
            </Col>
          </Row>
          
          {service.additionalInfo && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {service.additionalInfo}
            </Text>
          )}
        </div>
      </Card>
    </List.Item>
  );
};
```

### 6. Utilitários e Helpers

#### 6.1 Formatação e Validação
```typescript
// utils/formatters.ts
export const formatZipCode = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 5) {
    return numbers;
  }
  
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(2)} kg`;
};

export const formatDimensions = (height: number, width: number, length: number): string => {
  return `${height} x ${width} x ${length} cm`;
};

// utils/validators.ts
export const isValidZipCode = (zipCode: string): boolean => {
  return /^\d{5}-?\d{3}$/.test(zipCode);
};

export const calculateVolumeWeight = (volume: Volume): number => {
  // Peso cubado: (A x L x C) / 6000
  const cubicWeight = (volume.height * volume.width * volume.length) / 6000;
  return Math.max(volume.weight, cubicWeight);
};

export const calculateTotalAmount = (volumes: Volume[]): number => {
  return volumes.reduce((total, volume) => total + (volume.price * volume.quantity), 0);
};
```

#### 6.2 Custom Hooks
```typescript
// hooks/useDebounce.ts
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// hooks/useLocalStorage.ts
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  return [storedValue, setValue] as const;
};
```

### 7. Estilos SCSS

#### 7.1 Variáveis e Mixins
```scss
// styles/variables.scss
:root {
  // Colors
  --primary-color: #6366f1;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-disabled: #9ca3af;
  
  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  // Border radius
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  // Shadows
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

// Mixins
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin card-shadow {
  box-shadow: var(--shadow-md);
  border-radius: var(--border-radius-md);
}
```

#### 7.2 Componentes Específicos
```scss
// pages/QuotePage/QuotePage.scss
.quote-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  
  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
}

.zip-code-form {
  @include card-shadow;
  
  .ant-card-head {
    background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
    color: white;
    
    .ant-card-head-title {
      color: white;
    }
  }
}

.volume-form {
  @include card-shadow;
  
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  &__actions {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid #e5e7eb;
  }
}

.volume-item {
  padding: var(--spacing-md);
  border: 1px solid #e5e7eb;
  border-radius: var(--border-radius-md);
  background: #fafafa;
  
  &__header {
    @include flex-center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
    
    h4 {
      margin: 0;
      color: var(--text-primary);
    }
  }
  
  &:hover {
    border-color: var(--primary-color);
    background: white;
  }
}

.service-card {
  margin-bottom: var(--spacing-md);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  &__header {
    @include flex-center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
  }
  
  &__carrier {
    @include flex-center;
    gap: var(--spacing-sm);
    
    span {
      font-weight: 500;
      color: var(--text-primary);
    }
  }
  
  &__price {
    text-align: right;
    
    .ant-typography {
      display: block;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .quote-page {
    padding: var(--spacing-md);
  }
  
  .volume-item {
    .ant-col {
      margin-bottom: var(--spacing-sm);
    }
  }
  
  .service-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
}
```

### 8. Testes

#### 8.1 Testes de Componente
```typescript
// tests/components/ZipCodeForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ZipCodeForm } from '../../../src/pages/QuotePage/components/ZipCodeForm';
import { QuoteProvider } from '../../../src/contexts/QuoteContext';

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <QuoteProvider>
      {component}
    </QuoteProvider>
  );
};

describe('ZipCodeForm', () => {
  it('should render zip code inputs', () => {
    renderWithContext(<ZipCodeForm />);
    
    expect(screen.getByLabelText(/seu cep/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cep do comprador/i)).toBeInTheDocument();
  });
  
  it('should format zip code input', async () => {
    renderWithContext(<ZipCodeForm />);
    
    const input = screen.getByLabelText(/seu cep/i);
    fireEvent.change(input, { target: { value: '12345678' } });
    
    await waitFor(() => {
      expect(input).toHaveValue('12345-678');
    });
  });
  
  it('should show validation error for invalid zip code', async () => {
    renderWithContext(<ZipCodeForm />);
    
    const input = screen.getByLabelText(/seu cep/i);
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(screen.getByText(/CEP deve ter formato/i)).toBeInTheDocument();
    });
  });
});
```

#### 8.2 Testes de Integração
```typescript
// tests/integration/QuoteFlow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QuotePage } from '../../src/pages/QuotePage/QuotePage';
import { QuoteProvider } from '../../src/contexts/QuoteContext';

const server = setupServer(
  rest.post('/api/v1/quotes/calculate', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        services: [
          {
            serviceId: '1',
            carrierName: 'Carriers',
            serviceName: 'Expresso',
            price: 15.90,
            estimatedDays: 3
          }
        ]
      }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Quote Flow Integration', () => {
  it('should complete full quote flow', async () => {
    render(
      <QuoteProvider>
        <QuotePage />
      </QuoteProvider>
    );
    
    // Fill zip codes
    fireEvent.change(screen.getByLabelText(/seu cep/i), {
      target: { value: '13660-088' }
    });
    fireEvent.change(screen.getByLabelText(/cep do comprador/i), {
      target: { value: '38280-000' }
    });
    
    // Add volume
    fireEvent.click(screen.getByText(/adicionar primeiro volume/i));
    
    // Fill volume data
    const quantityInput = screen.getByLabelText(/quantidade/i);
    fireEvent.change(quantityInput, { target: { value: '1' } });
    
    const weightInput = screen.getByLabelText(/peso/i);
    fireEvent.change(weightInput, { target: { value: '2' } });
    
    // Submit form
    fireEvent.click(screen.getByText(/realizar cotação/i));
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/resultados da cotação/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/carriers/i)).toBeInTheDocument();
    expect(screen.getByText(/r\$ 15,90/i)).toBeInTheDocument();
  });
});
```

## Entregáveis

### Fase 1: Setup e Componentes Base (2 dias)
- [ ] Configuração inicial do projeto React
- [ ] Setup do Ant Design com tema customizado
- [ ] Componentes base (Logo, PageHeader, etc.)
- [ ] Context API para gerenciamento de estado
- [ ] Estrutura de pastas e arquivos

### Fase 2: Formulário de Cotação (2 dias)
- [ ] Formulário de CEPs com validação
- [ ] Formulário de volumes dinâmico
- [ ] Validações em tempo real
- [ ] Integração com API de cotação
- [ ] Estados de loading e erro

### Fase 3: Resultados e UX (1 dia)
- [ ] Tela de resultados da cotação
- [ ] Cards de serviços interativos
- [ ] Navegação entre etapas
- [ ] Feedback visual e animações
- [ ] Responsividade mobile

### Fase 4: Qualidade e Testes (1 dia)
- [ ] Testes unitários dos componentes
- [ ] Testes de integração do fluxo
- [ ] Documentação dos componentes
- [ ] Otimizações de performance

## Critérios de Aceitação

1. **Funcionalidade**: Fluxo completo de cotação funcionando
2. **Performance**: Carregamento inicial < 3s
3. **UX**: Interface intuitiva e responsiva
4. **Qualidade**: Cobertura de testes > 80%
5. **Acessibilidade**: Atender padrões WCAG 2.1

## Métricas de Sucesso

- **Time to Interactive**: < 3 segundos
- **Conversion Rate**: > 85% completam cotação
- **Error Rate**: < 2% de erros de formulário
- **Mobile Usage**: Interface funcional em devices móveis

## Próximos Passos

Após conclusão, seguir para PRD-004: Microserviço de Rastreamento.

---

**Responsável**: Frontend Team  
**Revisores**: UX Designer, Tech Lead  
**Última Atualização**: Janeiro 2025
