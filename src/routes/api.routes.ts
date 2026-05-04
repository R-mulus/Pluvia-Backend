/**
 * CAMINHO: src/routes/api.routes.ts
 * DESCRIÇÃO: Registro das rotas da API Pluvia.
 * CORREÇÃO: Adicionadas rotas POST e GET para /cronograma.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { CadastroService } from '../modules/cadastro/services/CadastroService.js';
import { CronogramaService } from '../modules/operacao/services/CronogramaService.js';
import { 
  UsuarioSchema, UsuarioUpdateSchema, 
  FazendaSchema, FazendaUpdateSchema, 
  PivoSchema, PivoUpdateSchema 
} from '../modules/cadastro/schemas/cadastro.schema.js';
import { ComandoCronogramaSchema, ComandoUpdateSchema } from '../modules/cadastro/schemas/comando.schema.js';

const router = Router();
const cadastro = new CadastroService();
const operacao = new CronogramaService();

// --- ROOT ---
router.get('/', (_req: Request, res: Response) => res.json({ system: "Pluvia API", status: "online" }));

// --- USUÁRIOS ---
router.get('/usuarios', async (_req: Request, res: Response) => {
  const result = await cadastro.listarUsuarios();
  res.json(result);
});

router.get('/usuarios/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cadastro.buscarUsuario(id);
  res.json(result);
});

router.post('/usuarios', async (req: Request, res: Response) => {
  const dados = UsuarioSchema.parse(req.body);
  const result = await cadastro.criarUsuario(dados);
  res.status(201).json(result);
});

router.patch('/usuarios/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dados = UsuarioUpdateSchema.parse(req.body);
  const result = await cadastro.editarUsuario(id, dados);
  res.json(result);
});

router.delete('/usuarios/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await cadastro.excluirUsuario(id);
  res.status(204).send();
});

// --- FAZENDAS ---
router.get('/fazendas', async (_req: Request, res: Response) => {
  const result = await cadastro.listarFazendas();
  res.json(result);
});

router.get('/fazendas/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cadastro.buscarFazenda(id);
  res.json(result);
});

router.post('/fazendas', async (req: Request, res: Response) => {
  const dados = FazendaSchema.parse(req.body);
  const result = await cadastro.criarFazenda(dados);
  res.status(201).json(result);
});

router.patch('/fazendas/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dados = FazendaUpdateSchema.parse(req.body);
  const result = await cadastro.editarFazenda(id, dados);
  res.json(result);
});

router.delete('/fazendas/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await cadastro.excluirFazenda(id);
  res.status(204).send();
});

// --- PIVÔS ---
router.get('/pivos', async (_req: Request, res: Response) => {
  const result = await cadastro.listarPivos();
  res.json(result);
});

router.get('/pivos/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cadastro.buscarPivo(id);
  res.json(result);
});

router.post('/pivos', async (req: Request, res: Response) => {
  const dados = PivoSchema.parse(req.body);
  const result = await cadastro.criarPivo(dados);
  res.status(201).json(result);
});

router.patch('/pivos/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dados = PivoUpdateSchema.parse(req.body);
  const result = await cadastro.editarPivo(id, dados);
  res.json(result);
});

router.delete('/pivos/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await cadastro.excluirPivo(id);
  res.status(204).send();
});

// --- CRONOGRAMA ---
// Rota GET para listar os agendamentos
router.get('/cronograma', async (_req: Request, res: Response) => {
  const result = await operacao.listar();
  res.json(result);
});

// Rota POST para criar um novo agendamento
router.post('/cronograma', async (req: Request, res: Response) => {
  const dados = ComandoCronogramaSchema.parse(req.body);
  const result = await operacao.agendar(dados);
  res.status(201).json(result);
});

router.patch('/cronograma/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  // Usando o esquema de update parcial para o comando
  const result = await operacao.editarComando(id, req.body);
  res.json(result);
});

router.delete('/cronograma/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await operacao.excluirComando(id);
  res.status(204).send();
});

export default router;