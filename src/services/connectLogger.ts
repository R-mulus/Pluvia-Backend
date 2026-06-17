import { supabase } from '../config/supabase.js';

export interface ConnectLogPayload {
    pivoId?: string | null;
    latenciaMs: number;
    statusConexao: boolean;
}

let ultimoStatus: boolean | null = null;
let ultimoLogTime: number = 0;

// Tempo de delay pra evitar spam no banco de dados
const INTERVALO_LOG_SUCESSO_MS = 60000;
const INTERVALO_LOG_FALHA_MS = 10000; 

// A parte lá de telemetria de rede do CLP
export async function registrarConexao(payload: ConnectLogPayload): Promise<void> {
    const agora = Date.now();
    const mudouStatus = payload.statusConexao !== ultimoStatus;
    
    const intervaloMinimo = payload.statusConexao ? INTERVALO_LOG_SUCESSO_MS : INTERVALO_LOG_FALHA_MS;

    // BLOQUEIO DO SPAM: Se não mudou o status e o tempo mínimo não passou, aborta o log.
    if (!mudouStatus && (agora - ultimoLogTime < intervaloMinimo)) {
        return;
    }

    ultimoStatus = payload.statusConexao;
    ultimoLogTime = agora;

    try {
        const { error } = await supabase.from('conect_logs').insert([{
            pivo_id: payload.pivoId || null,
            latencia_ms: payload.latenciaMs,
            status_conexao: payload.statusConexao
        }]);

        if (error) {
            console.error('[TELEMETRIA ERROR] Falha ao gravar latência no banco:', error.message);
        }
    } catch (err: any) {
        console.error('[TELEMETRIA EXCEPTION] Erro crítico no serviço de conexões:', err.message);
    }
}