import { z } from 'zod';

export const AddTrackingCodeSchema = z.object({
  code: z.string().min(1, 'Código de rastreamento é obrigatório'),
  carrier: z.string().min(1, 'Transportadora é obrigatória'),
  contractId: z.string().optional(),
  customerId: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional()
});

export type AddTrackingCodeCommand = z.infer<typeof AddTrackingCodeSchema>;
