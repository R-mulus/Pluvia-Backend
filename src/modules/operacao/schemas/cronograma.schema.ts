import { z } from 'zod';

export const PassoSchema = z.object({
  preset_origem_id: z.uuid().optional(),
  nome: z.string().min(3),
  angulo_inicial: z.number().min(0).max(360),
  angulo_final: z.number().min(0).max(360),
  lamina: z.number().min(0),
  irrigacao: z.boolean(),
  direcao: z.enum(['HORARIO', 'ANTI_HORARIO']),
  ordem: z.number().min(1) // <- ADICIONADO: Define quem roda primeiro
  // Removida a linha "horario: z.iso.datetime(...)"
});

export const CronogramaSchema = z.object({
  pivo_id: z.uuid("ID do pivô inválido"),
  nome: z.string().min(3, "Nome do cronograma obrigatório"),
  // ADICIONADO: O cronograma inteiro começa neste momento exato
  horario_inicio: z.iso.datetime({ message: "Formato de data/horário inválido" }), 
  passos: z.array(PassoSchema).min(1, "O cronograma deve ter pelo menos um passo")
});

export type CriarCronogramaDTO = z.infer<typeof CronogramaSchema> & { criado_por: string };