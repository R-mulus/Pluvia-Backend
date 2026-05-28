import { z } from 'zod';

export const PresetSchema = z.object({
  pivo_id: z.uuid("ID do pivô inválido"),
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  angulo_inicial: z.number().min(0).max(360),
  angulo_final: z.number().min(0).max(360),
  lamina: z.number().min(0),
  irrigacao: z.boolean(),
  direcao: z.enum(['HORARIO', 'ANTI_HORARIO'])
});

export type CriarPresetDTO = z.infer<typeof PresetSchema> & { criado_por: string };