import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { supabase } from './lib/supabase.js';
import { 
  UsuarioSchema, UsuarioUpdateSchema,
  FazendaSchema, FazendaUpdateSchema,
  PivoSchema, PivoUpdateSchema 
} from './schemas/cadastro.schema.js';

const app = express();

// --- SEGURANÇA ---
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 

// --- AUXILIARES ---
const formatPoint = (coord?: string) => coord ? `(${coord})` : null;


// ---------- USUÁRIOS ----------

app.post('/usuarios', async (req: Request, res: Response) => {
  try {
    const dados = UsuarioSchema.parse(req.body);
    const { data, error } = await supabase.from('usuarios').insert([dados]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.errors || err.message });
  }
});

app.get('/usuarios', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.put('/usuarios/:id', async (req: Request, res: Response) => {
  try {
    const dados = UsuarioUpdateSchema.parse(req.body);
    const { data, error } = await supabase.from('usuarios').update(dados).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
});

app.delete('/usuarios/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // REGRA: Usuário dono de fazenda
  const { count: fazendasCount } = await supabase
    .from('fazendas')
    .select('*', { count: 'exact', head: true })
    .eq('proprietario_id', id);

  if (fazendasCount && fazendasCount > 0) {
    return res.status(400).json({ error: "Não é possível excluir este usuário pois ele é proprietário de uma ou mais fazendas." });
  }

  // REGRA: Usuário operador de pivô
  const { count: operadorCount } = await supabase
    .from('pivo_operadores')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', id);

  if (operadorCount && operadorCount > 0) {
    return res.status(400).json({ error: "Não é possível excluir este usuário pois ele está vinculado como operador de pivôs." });
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) return res.status(400).json(error);
  res.status(204).send();
});


// ---------- FAZENDAS ----------

app.post('/fazendas', async (req: Request, res: Response) => {
  try {
    const dados = FazendaSchema.parse(req.body);
    const payload = { ...dados, coordenadas: formatPoint(dados.coordenadas) };
    const { data, error } = await supabase.from('fazendas').insert([payload]).select().single();
    if (error) return res.status(400).json(error);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
});

app.get('/fazendas', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('fazendas').select('*, usuarios(nome)');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.put('/fazendas/:id', async (req: Request, res: Response) => {
  try {
    const dados = FazendaUpdateSchema.parse(req.body);
    // @ts-ignore
    const payload = dados.coordenadas ? { ...dados, coordenadas: formatPoint(dados.coordenadas) } : dados;
    const { data, error } = await supabase.from('fazendas').update(payload).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
});

app.delete('/fazendas/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // REGRA: Fazenda com pivôs vinculados

  const { count: pivosCount } = await supabase
    .from('pivos')
    .select('*', { count: 'exact', head: true })
    .eq('fazenda_id', id);

  if (pivosCount && pivosCount > 0) {
    return res.status(400).json({ error: "Não é possível excluir esta fazenda enquanto houver pivôs vinculados a ela." });
  }

  const { error } = await supabase.from('fazendas').delete().eq('id', id);
  if (error) return res.status(400).json(error);
  res.status(204).send();
});


// ---------- PIVÔS ----------
app.post('/pivos', async (req: Request, res: Response) => {
  try {
    const dados = PivoSchema.parse(req.body);
    // @ts-ignore
    const payload = { ...dados, coordenadas: formatPoint(dados.coordenadas) };
    const { data: pivo, error } = await supabase.from('pivos').insert([payload]).select().single();
    if (error) return res.status(400).json(error);

    // Inicializa Status Automático
    await supabase.from('pivo_status').insert([{ pivo_id: pivo.id }]);

    res.status(201).json(pivo);
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
});

app.get('/pivos', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('pivos').select('*, fazendas(nome_fazenda), pivo_status(*)');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.put('/pivos/:id', async (req: Request, res: Response) => {
  try {
    const dados = PivoUpdateSchema.parse(req.body);
    // @ts-ignore
    const payload = dados.coordenadas ? { ...dados, coordenadas: formatPoint(dados.coordenadas) } : dados;
    const { data, error } = await supabase.from('pivos').update(payload).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
});

app.delete('/pivos/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('pivos').delete().eq('id', req.params.id);
  if (error) return res.status(400).json(error);
  res.status(204).send();
});

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor Pluvia operacional na porta ${PORT}`);
});