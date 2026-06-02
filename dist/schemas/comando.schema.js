import { z } from 'zod';
export const ComandoCronogramaSchema = z.object({
    pivoId: z.string().uuid(),
    criadoPor: z.string().uuid(),
    horario: z.string().datetime(),
    comando: z.object({
        percentimetro: z.number().min(0).max(100),
        angulo_inicial: z.number(),
        angulo_final: z.number(),
        irrigacao: z.boolean(),
        direcao: z.enum(['HORARIO', 'ANTI_HORARIO'])
    })
});
//# sourceMappingURL=comando.schema.js.map