import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
// # sourceMappingURL=supabase.js.map