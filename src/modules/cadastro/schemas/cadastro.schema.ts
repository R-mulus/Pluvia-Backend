/**
 * CAMINHO: src/modules/cadastro/schemas/cadastro.schema.ts
 *
 * CORREÇÕES:
 *  - #2: operador_id agora é .optional() em criarPivoSchema, refletindo que a
 *        tabela pivo_operadores é independente e um pivô pode existir sem operador.
 *  - #9: PivoUpdateSchema construído manualmente sem operador_id, evitando que
 *        um PATCH tente escrever essa coluna inexistente na tabela pivos.
 */
import { z } from 'zod';

// Validador de formato de coordenadas (latitude, longitude)
const CoordenadasSchema = z.string().regex(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, {
  message: "Coordenadas devem estar no formato 'latitude, longitude'"
});

// ==========================================
// 1. DOMÍNIO: USUÁRIOS
// ==========================================

export const criarUsuarioSchema = z.object({
  nome:        z.string({ error: "Nome é obrigatório" }).min(3, "O nome deve ter pelo menos 3 caracteres"),
  cargo:       z.enum(['Administrador', 'Operador', 'Cliente'], { error: "Cargo inválido" }),
  email:       z.email("E-mail inválido"),
  senha_token: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  cpf_cnpj:   z.string().min(11, "CPF/CNPJ inválido"),
  telefone:    z.string().optional()
});

export const UsuarioSchema = criarUsuarioSchema.extend({
  id:         z.uuid(),
  created_at: z.string()
});

export const UsuarioUpdateSchema = criarUsuarioSchema.partial();

export type CriarUsuarioDTO = z.infer<typeof criarUsuarioSchema>;
export type UsuarioDTO      = z.infer<typeof UsuarioSchema>;


// ==========================================
// 2. DOMÍNIO: FAZENDAS
// ==========================================

export const criarFazendaSchema = z.object({
  nome_fazenda:          z.string().min(3, "O nome da fazenda deve ter pelo menos 3 caracteres"),
  codigo_identificacao:  z.string().min(1, "Código é obrigatório"),
  proprietario_id:       z.uuid("ID do proprietário inválido"),
  endereco:              z.string().optional(),
  coordenadas:           CoordenadasSchema.optional(),
  cidade:                z.string().optional(),
  estado:                z.string().length(2, "Use a sigla do estado (ex: MG)").optional(),
  area_total:            z.number().positive("A área deve ser maior que zero").optional(),
  cultura:               z.array(z.string()).optional()
});

export const FazendaSchema = criarFazendaSchema.extend({
  id: z.uuid()
});

export const FazendaUpdateSchema = criarFazendaSchema.partial();

export type CriarFazendaDTO = z.infer<typeof criarFazendaSchema>;
export type FazendaDTO      = z.infer<typeof FazendaSchema>;


// ==========================================
// 3. DOMÍNIO: PIVÔS
// ==========================================

// Campos que vão de fato para a tabela `pivos`
const pivoBaseSchema = z.object({
  fazenda_id:   z.uuid("ID da fazenda inválido"),
  nome_pivo:    z.string().min(2, "O nome do pivô deve ter pelo menos 2 caracteres"),
  codigo_serie: z.string().min(1, "Código de série é obrigatório"),
  modelo:       z.string().optional(),
  marca:        z.string().optional(),
  vazao:        z.number().positive(),
  raio:         z.number().positive(),
  coordenadas:  z.string()
});

export const criarPivoSchema = pivoBaseSchema.extend({
  // FIX #2: opcional — a relação em pivo_operadores é criada separadamente no
  // repositório; um pivô pode existir sem operador vinculado.
  operador_id: z.uuid("ID do operador inválido").optional()
});

export const PivoSchema = pivoBaseSchema.extend({
  id:              z.uuid(),
  delta_device_id: z.string()
});

// FIX #9: Schema de update construído APENAS com os campos da tabela `pivos`.
// operador_id é excluído intencionalmente — atualizá-lo exigiria lógica própria
// na tabela pivo_operadores, não um simples PATCH na tabela pivos.
export const PivoUpdateSchema = pivoBaseSchema.partial();

export type CriarPivoDTO = z.infer<typeof criarPivoSchema>;
export type PivoDTO      = z.infer<typeof PivoSchema>;

// import { z } from 'zod';

// // Validador de formato de coordenadas (latitude, longitude)
// const CoordenadasSchema = z.string().regex(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, {
//   message: "Coordenadas devem estar no formato 'latitude, longitude'"
// });

// // ==========================================
// // 1. DOMÍNIO: USUÁRIOS
// // ==========================================

// // Schema exclusivo para validação do payload de criação (Entrada)
// export const criarUsuarioSchema = z.object({
//   nome: z.string({ error: "Nome é obrigatório" }).min(3, "O nome deve ter pelo menos 3 caracteres"),
//   cargo: z.enum(['Administrador', 'Operador', 'Cliente'], { error: "Cargo inválido" }),
//   email: z.email("E-mail inválido"),
//   senha_token: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
//   cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
//   telefone: z.string().optional()
// });

// // Schema que representa a entidade completa no Banco de Dados
// export const UsuarioSchema = criarUsuarioSchema.extend({
//   id: z.uuid(),
//   created_at: z.string()
// });

// export const UsuarioUpdateSchema = criarUsuarioSchema.partial();

// // Inferência dos Tipos (DTOs) para exportação automática ao TypeScript
// export type CriarUsuarioDTO = z.infer<typeof criarUsuarioSchema>;
// export type UsuarioDTO = z.infer<typeof UsuarioSchema>;


// // ==========================================
// // 2. DOMÍNIO: FAZENDAS
// // ==========================================

// export const criarFazendaSchema = z.object({
//   nome_fazenda: z.string().min(3, "O nome da fazenda deve ter pelo menos 3 caracteres"),
//   codigo_identificacao: z.string().min(1, "Código é obrigatório"),
//   proprietario_id: z.uuid("ID do proprietário inválido"),
//   endereco: z.string().optional(),
//   coordenadas: CoordenadasSchema.optional(),
//   cidade: z.string().optional(),
//   estado: z.string().length(2, "Use a sigla do estado (ex: MG)").optional(),
//   area_total: z.number().positive("A área deve ser maior que zero").optional(),
//   cultura: z.array(z.string()).optional()
// });

// export const FazendaSchema = criarFazendaSchema.extend({
//   id: z.uuid()
// });

// export const FazendaUpdateSchema = criarFazendaSchema.partial();

// export type CriarFazendaDTO = z.infer<typeof criarFazendaSchema>;
// export type FazendaDTO = z.infer<typeof FazendaSchema>;


// // ==========================================
// // 3. DOMÍNIO: PIVÔS
// // ==========================================

// export const criarPivoSchema = z.object({
//   fazenda_id: z.uuid("ID da fazenda inválido"),
//   operador_id: z.uuid("ID do operador inválido"),
//   nome_pivo: z.string().min(2, "O nome do pivô deve ter pelo menos 2 caracteres"),
//   codigo_serie: z.string().min(1, "Código de série é obrigatório"),
//   modelo: z.string().optional(),
//   marca: z.string().optional(),
//   vazao: z.number().positive(),
//   raio: z.number().positive(),       
//   coordenadas: z.string()             
// });

// export const PivoSchema = criarPivoSchema.omit({ operador_id: true }).extend({
//   id: z.uuid(),
//   delta_device_id: z.string()
// });

// export const PivoUpdateSchema = criarPivoSchema.partial();

// export type CriarPivoDTO = z.infer<typeof criarPivoSchema>;
// export type PivoDTO = z.infer<typeof PivoSchema>;