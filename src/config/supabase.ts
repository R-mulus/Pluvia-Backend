import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Força o dotenv a ler o ficheiro .env que está exatamente na raiz
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

// Verificação de segurança pro debug
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no ficheiro .env');
}

// Usando a Service Role Key no backend para ignorar políticas de RLS 
// e permitir que o servidor registe logs de auditoria livremente (Tá resolvido essa parte já)
export const supabase = createClient(supabaseUrl, supabaseKey);