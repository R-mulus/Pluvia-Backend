import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Descobrir a diretoria atual deste ficheiro de forma absoluta
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Forçar o dotenv a ler o ficheiro .env que está exatamente na raiz (duas diretorias acima de src/config)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Usando variáveis de ambiente (.env) para estas chaves por segurança
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

// Verificação de segurança para ajudar no debug
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no ficheiro .env');
}

// Usando a Service Role Key no backend para ignorar políticas de RLS 
// e permitir que o servidor registe logs de auditoria livremente
export const supabase = createClient(supabaseUrl, supabaseKey);