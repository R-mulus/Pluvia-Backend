import { z } from 'zod';

// Validação para o tipo 'point' do Postgres (ex: "-18.5, -46.5")
const CoordenadasSchema = z.string().regex(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, "Formato inválido. Use: 'lat, long'");

// --- USUÁRIOS ---
export const UsuarioSchema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  cargo: z.string().optional(),
  email: z.string().email("E-mail inválido"),
  senha_token: z.string().min(6, "A senha/token deve ter ao menos 6 caracteres"),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
  telefone: z.string().optional(),
});

export const UsuarioUpdateSchema = UsuarioSchema.partial();

// --- FAZENDAS ---
export const FazendaSchema = z.object({
  proprietario_id: z.string().uuid("ID do proprietário inválido"),
  nome_fazenda: z.string().min(2, "Nome da fazenda muito curto"),
  codigo_identificacao: z.string().min(1, "Código de identificação obrigatório"),
  endereco: z.string().optional(),
  coordenadas: CoordenadasSchema.optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  area_total: z.number().optional(),
  cultura: z.array(z.string()).optional(),
});

export const FazendaUpdateSchema = FazendaSchema.partial();

// --- PIVÔS ---
export const PivoSchema = z.object({
  fazenda_id: z.string().uuid("ID da fazenda inválido"),
  nome_pivo: z.string().min(1, "Nome do pivô obrigatório"),
  codigo_serie: z.string().min(1, "Código de série obrigatório"),
  delta_device_id: z.string().min(1, "ID do dispositivo Delta obrigatório"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  vazao_nominal: z.number().optional(),
  raio_pivo: z.number().optional(),
  coordenadas: CoordenadasSchema.optional(),
});

export const PivoUpdateSchema = PivoSchema.partial();