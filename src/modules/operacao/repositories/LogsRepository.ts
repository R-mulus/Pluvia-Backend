import { supabase } from '../../../config/supabase.js';

export interface InsertEventLogDTO {
  // Ajustado para refletir a nova coluna do banco de dados
  cronograma_passo_id?: string | null;
  pivo_id: string;
  operador_id: string;
  tipo_evento: 'ACIONAMENTO_MANUAL' | 'AGENDAMENTO' | 'EDICAO' | 'EXCLUSAO' | 'FALHA';
  codigo?: string | null;
}

export class LogsRepository {
  // Lista logs de auditoria humana/autômatos (RF06)
  async listEventLogs(pivoId: string, limit: number) {
    return await supabase
      .from('event_logs')
      // Ajustado: Busca o nome do passo (já que o comando JSON não existe mais)
      .select('*, usuarios(nome), cronograma_passos(nome, lamina, angulo_inicial, angulo_final)')
      .eq('pivo_id', pivoId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  }

  // Lista logs de telemetria de rede gerados pelo worker (RF06)
  async listConectLogs(pivoId: string, limit: number) {
    return await supabase
      .from('conect_logs')
      .select('*')
      .eq('pivo_id', pivoId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  }

  // Grava uma nova entrada imutável de auditoria (RN02)
  async createEventLog(dados: InsertEventLogDTO) {
    return await supabase
      .from('event_logs')
      .insert(dados)
      .select()
      .maybeSingle();
  }
}