import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no ficheiro .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);