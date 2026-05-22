import { z } from 'zod';

export const ComandoCronogramaSchema = z.object({
  pivo_id: z.uuid("ID do pivô inválido"),
  criado_por: z.uuid("ID do criador inválido"),
  horario: z.iso.datetime({ message: "Formato de data/horário inválido (deve ser ISO 8601)" }),
  // Estrutura mantida intacta conforme solicitado
  comando: z.object({
    percentimetro: z.number().min(0).max(100),
    angulo_inicial: z.number().min(0).max(360),
    angulo_final: z.number().min(0).max(360),
    irrigacao: z.boolean(),
    direcao: z.enum(['HORARIO', 'ANTI_HORARIO'])
  })
});

export const ComandoUpdateSchema = ComandoCronogramaSchema.partial();

// Inferência de Tipos (DTOs) para eliminar o uso de 'any'
export type CriarComandoDTO = z.infer<typeof ComandoCronogramaSchema>;
export type UpdateComandoDTO = z.infer<typeof ComandoUpdateSchema>;