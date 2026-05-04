import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Usando variáveis de ambiente (.env) para estas chaves por segurança
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 


// Verificação de segurança para ajudar no debug
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no arquivo .env');
}

// Usando a Service Role Key no backend para ignorar políticas de RLS 
// e permitir que o servidor registre logs de auditoria livremente
export const supabase = createClient(supabaseUrl, supabaseKey);

