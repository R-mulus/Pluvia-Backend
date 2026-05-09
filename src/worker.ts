import 'dotenv/config';
import { supabase } from './config/supabase.js';
import ModbusRTU from 'modbus-serial';

const client = new (ModbusRTU as any)();

// --- CONFIGURAÇÕES DE HARDWARE ---
const PLC_CONFIG = { host: "127.0.0.1", port: 10003 };
const STATION_ID = 1;

const ADDR_START = 0;   // M0: Gatilho de início da IRRIGACAO
const ADDR_DONE = 10;   // M10: Feedback de conclusão

async function garantirConexao() {
    if (!client.isOpen) {
        try {
            await client.connectTCP(PLC_CONFIG.host, { port: PLC_CONFIG.port });
            client.setID(STATION_ID);
            console.log("[MODBUS] Conexão Modbus estabelecida!");
        } catch (err: any) {
            console.error("[ERROR] Erro ao conectar no CLP:", err.message);
        }
    }
}

async function startWorker() {
    console.log("[WORKER] Worker Pluvia iniciado. Monitorando cronograma...");
    
    setInterval(async () => {
        const agora = new Date();
        const horaLog = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

        // LOG CÍCLICO: Mostra que o worker está vivo e procurando
        console.log(`[WORKER: ${horaLog}] Escaneando cronograma no Supabase por tarefas 'aguardando'.`);

        try {
            await garantirConexao();

            // Busca tarefas aguardando
            const { data: tarefas, error } = await supabase
                .from('cronograma')
                .select('*')
                .eq('status_final', 'aguardando');

            if (error) {
                console.error("[ERROR] Erro ao buscar no Supabase:", error.message);
                return;
            }

            // Log de ociosidade caso não encontre nada
            if (!tarefas || tarefas.length === 0) {
                console.log(`[${horaLog}] Nenhuma tarefa pendente encontrada.`);
                return;
            }

            for (const tarefa of tarefas) {
                // Extração robusta do horário (HH:mm)
                const match = (tarefa.horario || "").match(/(\d{2}:\d{2})/);
                const hBanco = match ? match[1] : "";

                if (hBanco === horaAtual) {
                    // Parsing do comando JSON
                    const cmd = typeof tarefa.comando === 'string' ? JSON.parse(tarefa.comando) : tarefa.comando;
                    
                    if (cmd?.irrigacao === true) {
                        console.log(`[WORKER] Horário atingido (${horaAtual})! Iniciando irrigação (ID: ${tarefa.id})`);

                        // 1. Bloqueia a tarefa no banco
                        await supabase.from('cronograma').update({ status_final: 'executando' }).eq('id', tarefa.id);

                        if (client.isOpen) {
                            // 2. Liga o M0 no CLP
                            await client.writeCoil(ADDR_START, true);
                            console.log(`[MODBUS] Sinal enviado ao CLP (M0 ON)`);

                            // 3. Monitora o feedback M10
                            let segundosPassados = 0;
                            const monitor = setInterval(async () => {
                                try {
                                    const res = await client.readCoils(ADDR_DONE, 1);
                                    segundosPassados++;

                                    if (res.data[0] === true) {
                                        console.log(`[MODBUS] Feedback M10 recebido! Finalizando tarefa.`);
                                        
                                        // Finaliza no banco
                                        await supabase.from('cronograma').update({ status_final: 'concluido' }).eq('id', tarefa.id);
                                        
                                        // Reset do M0 (limpa o Timer no Ladder)
                                        await client.writeCoil(ADDR_START, false);
                                        console.log(`[MODBUS] M0 desligado para resetar o Ladder.`);
                                        
                                        clearInterval(monitor);
                                    }

                                    // Segurança: Timeout de 30s caso o CLP trave
                                    if (segundosPassados > 60) {
                                        console.warn("[MODBUS] CLP demorou muito para responder (M10). Cancelando monitoramento.");
                                        clearInterval(monitor);
                                    }
                                } catch (e) {
                                    clearInterval(monitor);
                                }
                            }, 500);
                        }
                    } else {
                        // Se irrigação for false, apenas conclui sem acionar nada
                        await supabase.from('cronograma').update({ status_final: 'concluido' }).eq('id', tarefa.id);
                    }
                }
            }
        } catch (err: any) {
            console.error("[ERROR] Erro no ciclo do Worker:", err.message);
        }
    }, 10000); 
}

startWorker();