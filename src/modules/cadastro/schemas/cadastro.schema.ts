import { z } from "zod";

// Validação do formato das coordenadas (latitude, longitude)
// ! REGEX AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA😭😭😭😭😭😭😭😭
const CoordenadasSchema = z.string().regex(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, {
  message: "Coordenadas devem estar no formato 'latitude, longitude'",
});

// * --------------- USUÁRIOS ---------------

export const criarUsuarioSchema = z.object({
  nome: z
    .string({ error: "Nome é obrigatório" })
    .min(3, "O nome deve ter pelo menos 3 caracteres"),
  cargo: z.enum(["Administrador", "Operador", "Cliente"], {
    error: "Cargo inválido",
  }),
  email: z.email("E-mail inválido"),
  senha_token: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
  telefone: z.string().optional(),
});

export const UsuarioSchema = criarUsuarioSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
});

export const UsuarioUpdateSchema = criarUsuarioSchema.partial();

export type CriarUsuarioDTO = z.infer<typeof criarUsuarioSchema>;
export type UsuarioDTO = z.infer<typeof UsuarioSchema>;

// * --------------- FAZENDAS ---------------

export const criarFazendaSchema = z.object({
  nome_fazenda: z
    .string()
    .min(3, "O nome da fazenda deve ter pelo menos 3 caracteres"),
  codigo_identificacao: z.string().min(1, "Código é obrigatório"),
  proprietario_id: z.uuid("ID do proprietário inválido"),
  endereco: z.string().optional(),
  coordenadas: CoordenadasSchema.optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2, "Use a sigla do estado (ex: MG)").optional(),
  area_total: z.number().positive("A área deve ser maior que zero").optional(),
  cultura: z.array(z.string()).optional(),
});

export const FazendaSchema = criarFazendaSchema.extend({
  id: z.uuid(),
});

export const FazendaUpdateSchema = criarFazendaSchema.partial();

export type CriarFazendaDTO = z.infer<typeof criarFazendaSchema>;
export type FazendaDTO = z.infer<typeof FazendaSchema>;

// * --------------- PIVÔS ---------------

const pivoBaseSchema = z.object({
  fazenda_id: z.uuid("ID da fazenda inválido"),
  nome_pivo: z
    .string()
    .min(2, "O nome do pivô deve ter pelo menos 2 caracteres"),
  codigo_serie: z.string().min(1, "Código de série é obrigatório"),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  vazao: z.number().positive(),
  raio: z.number().positive(),
  coordenadas: z.string(),
});

export const criarPivoSchema = pivoBaseSchema.extend({
  operador_id: z.uuid("ID do operador inválido").optional(),
});

export const PivoSchema = pivoBaseSchema.extend({
  id: z.uuid(),
  delta_device_id: z.string(),
});

export const PivoUpdateSchema = pivoBaseSchema.partial();

export type CriarPivoDTO = z.infer<typeof criarPivoSchema>;
export type PivoDTO = z.infer<typeof PivoSchema>;
