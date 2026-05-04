import { z } from 'zod';

export const ComandoCronogramaSchema = z.object({
  pivo_id: z.string().uuid(),
  criado_por: z.string().uuid(),
  horario: z.string().datetime(), // ISO string
  comando: z.object({
    percentimetro: z.number().min(0).max(100),
    angulo_inicial: z.number().min(0).max(360),
    angulo_final: z.number().min(0).max(360),
    irrigacao: z.boolean(),
    direcao: z.enum(['HORARIO', 'ANTI_HORARIO'])
  })
});

export const ComandoUpdateSchema = ComandoCronogramaSchema.partial();