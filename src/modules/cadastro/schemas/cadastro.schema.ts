import { z } from 'zod';

const CoordenadasSchema = z.string().regex(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, {
  message: "Coordenadas devem estar no formato 'latitude, longitude'"
});

export const UsuarioSchema = z.object({
  nome: z.string().min(3),
  cargo: z.string().optional(),
  email: z.string().email(),
  senha_token: z.string().min(6),
  cpf_cnpj: z.string().min(11),
  telefone: z.string().optional()
});

export const UsuarioUpdateSchema = UsuarioSchema.partial();

export const FazendaSchema = z.object({
  proprietario_id: z.string().uuid(),
  nome_fazenda: z.string().min(2),
  codigo_identificacao: z.string(),
  endereco: z.string().optional(),
  coordenadas: CoordenadasSchema.optional(),
  area_total: z.number().optional(),
  cultura: z.array(z.string()).optional(),
  // NOVOS CAMPOS ADICIONADOS AQUI:
  cidade: z.string().optional(),
  estado: z.string().optional()
});

export const FazendaUpdateSchema = FazendaSchema.partial();

export const PivoSchema = z.object({
  fazenda_id: z.string().uuid(),
  nome_pivo: z.string().min(2),
  codigo_serie: z.string(),
  modelo: z.string().optional(),
  fabricante: z.string().optional()
});

export const PivoUpdateSchema = PivoSchema.partial();