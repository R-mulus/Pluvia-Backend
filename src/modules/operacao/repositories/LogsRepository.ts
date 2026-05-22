import { supabase } from '../../../config/supabase.js';

export interface InsertEventLogDTO {
  cronograma_id?: string | null;
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
      .select('*, usuarios(nome), cronograma(comando)')
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