import { supabase } from '../config/supabase.js';

export interface EventLogPayload {
    cronogramaId?: string;
    cronogramaPassoId?: string;
    pivoId?: string;
    operadorId?: string;
    tipoEvento: 'comando' | 'sensor' | 'pausa_manual' | 'pausa_automatica' | 'erro' | 'alerta' | 'conclusao'; //ENUM_TYPES do banco de dados
    codigo: string;
}

//A parte lá de registro de eventos de auditoria do pivô
//Toda gravação na tabela event_logs DEVE passar por aqui.

export async function registrarEvento(payload: EventLogPayload): Promise<void> {
    try {
        const { error } = await supabase.from('event_logs').insert([{
            cronograma_id: payload.cronogramaId || null,
            cronograma_passo_id: payload.cronogramaPassoId || null,
            pivo_id: payload.pivoId || null,
            operador_id: payload.operadorId || null,
            tipo_evento: payload.tipoEvento,
            codigo: payload.codigo
        }]);

        if (error) {
            console.error('[LOGGER ERROR] Falha ao gravar evento no banco:', error.message);
        }
    } catch (err: any) {
        console.error('[LOGGER EXCEPTION] Erro crítico no serviço de eventos:', err.message);
    }
}