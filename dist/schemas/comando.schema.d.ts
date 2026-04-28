import { z } from 'zod';
export declare const ComandoCronogramaSchema: z.ZodObject<{
    pivoId: z.ZodString;
    criadoPor: z.ZodString;
    horario: z.ZodString;
    comando: z.ZodObject<{
        percentimetro: z.ZodNumber;
        angulo_inicial: z.ZodNumber;
        angulo_final: z.ZodNumber;
        irrigacao: z.ZodBoolean;
        direcao: z.ZodEnum<{
            HORARIO: "HORARIO";
            ANTI_HORARIO: "ANTI_HORARIO";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=comando.schema.d.ts.map