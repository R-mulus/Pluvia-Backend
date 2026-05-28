import { supabase } from '../../../config/supabase.js';

export interface InsertEventLogDTO {
  cronograma_id?: string | null;
  cronograma_passo_id?: string | null; 
  pivo_id: string;
  operador_id: string;
  // Alterado para letras minúsculas para bater com o Enum do banco
  tipo_evento: 'acionamento_manual' | 'agendamento' | 'edicao' | 'exclusao' | 'falha';
  codigo?: string | null;
}

export class LogsRepository {
  async listEventLogs(pivoId: string, limit: number) {
    return await supabase
      .from('event_logs')
      .select(`
        *, 
        usuarios(nome), 
        cronogramas(nome),
        cronograma_passos(nome, lamina, angulo_inicial, angulo_final)
      `)
      .eq('pivo_id', pivoId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  }

  async listConectLogs(pivoId: string, limit: number) {
    return await supabase
      .from('conect_logs')
      .select('*')
      .eq('pivo_id', pivoId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  }

  async createEventLog(dados: InsertEventLogDTO) {
    const { data, error } = await supabase
      .from('event_logs')
      .insert(dados)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Insert Error] ${error.message} - Code: ${error.code}`);
    }

    return data;
  }
}