import 'dotenv/config';
import { supabase } from './config/supabase.js';
import ModbusRTU from 'modbus-serial';

import { registrarEvento } from './services/eventLogger.js';
import { registrarConexao } from './services/connectLogger.js';
import { EVENT_CODES } from './logs/eventCodes.js';

// --- CONFIGURAÇÕES E CONSTANTES ---
const PLC_CONFIG = { host: "127.0.0.1", port: 10003 };
const STATION_ID = 1;

const COIL_START = 0;      
const COIL_BOMBA = 1;      
const COIL_DIRECAO = 2;    
const COIL_DONE = 10;      

const REG_ANG_INI = 100;   
const REG_ANG_FIM = 102;   
const REG_VELOCIDADE = 104;

const TIMEOUT_SEGUNDOS = 300; 
const TEMPO_ESPERA_ENTRE_PASSOS_MS = 5000; 
const JANELA_PRECISAO_MS = 60000; 

const client = new (ModbusRTU as any)();

// --- SISTEMA DE LOCKS ---
let workerExecutando = false;
const pivosEmExecucao = new Set<string>();
const cronogramasEmProcessamento = new Set<string>(); 
let modbusFila: (() => void)[] = [];
let modbusOcupado = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// WRAPPERS MODBUS COM TELEMETRIA AUTOMÁTICA (LATÊNCIA E CONEXÃO)
// ============================================================================
async function modbusWriteCoil(pivoId: string, address: number, value: boolean) {
    const start = Date.now();
    try {
        await client.writeCoil(address, value);
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: true });
    } catch (e: any) {
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: false });
        await registrarEvento({ pivoId, tipoEvento: 'erro', codigo: EVENT_CODES.ERRO_MODBUS });
        throw e;
    }
}

async function modbusWriteRegister(pivoId: string, address: number, value: number) {
    const start = Date.now();
    try {
        await client.writeRegister(address, value);
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: true });
    } catch (e: any) {
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: false });
        await registrarEvento({ pivoId, tipoEvento: 'erro', codigo: EVENT_CODES.ERRO_MODBUS });
        throw e;
    }
}

async function modbusReadCoils(pivoId: string, address: number, length: number) {
    const start = Date.now();
    try {
        const feedback = await client.readCoils(address, length);
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: true });
        return feedback;
    } catch (e: any) {
        await registrarConexao({ pivoId, latenciaMs: Date.now() - start, statusConexao: false });
        await registrarEvento({ pivoId, tipoEvento: 'erro', codigo: EVENT_CODES.ERRO_MODBUS });
        throw e;
    }
}

// ============================================================================
// MUTEX MODBUS - SERIALIZAÇÃO TOTAL DA COMUNICAÇÃO
// ============================================================================
async function withModbusLock<T>(pivoId: string, action: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const task = async () => {
            modbusOcupado = true;
            try {
                if (!client.isOpen) {
                    const startConnect = Date.now();
                    try {
                        await client.connectTCP(PLC_CONFIG.host, { port: PLC_CONFIG.port });
                        client.setID(STATION_ID);
                        await registrarConexao({ pivoId, latenciaMs: Date.now() - startConnect, statusConexao: true });
                        await registrarEvento({ pivoId, tipoEvento: 'alerta', codigo: EVENT_CODES.MODBUS_CONECTADO });
                    } catch (err: any) {
                        await registrarConexao({ pivoId, latenciaMs: Date.now() - startConnect, statusConexao: false });
                        throw err;
                    }
                }
                const result = await action();
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                modbusOcupado = false;
                if (modbusFila.length > 0) {
                    const nextTask = modbusFila.shift();
                    if (nextTask) nextTask();
                }
            }
        };

        if (modbusOcupado) {
            modbusFila.push(task);
        } else {
            task();
        }
    });
}

// ============================================================================
// FUNÇÕES DE LIMPEZA
// ============================================================================
async function limparModbus(pivoId: string) {
    console.log("🧹 [LIMPANDO MODBUS] Zerando registradores e coils...");
    try {
        await modbusWriteRegister(pivoId, REG_ANG_INI, 0);
        await modbusWriteRegister(pivoId, REG_ANG_FIM, 0);
        await modbusWriteRegister(pivoId, REG_VELOCIDADE, 0);
        
        await modbusWriteCoil(pivoId, COIL_DIRECAO, false);
        await modbusWriteCoil(pivoId, COIL_BOMBA, false);
        await modbusWriteCoil(pivoId, COIL_START, false);
        await modbusWriteCoil(pivoId, COIL_DONE, false);
        console.log("✅ [MODBUS LIMPO]");
    } catch (error: any) {
        console.error("❌ [ERRO LIMPEZA MODBUS] Falha ao tentar limpar a memória do CLP:", error.message);
    }
}

// ============================================================================
// EXECUÇÃO DO PASSO INDIVIDUAL
// ============================================================================
async function executarPasso(passo: any): Promise<void> {
    const pivoId = passo.pivo_id;
    const cronogramaId = passo.cronograma_id;

    await withModbusLock(pivoId, async () => {
        try {
            console.log(`\n🚀 [INICIANDO PASSO] Ordem: ${passo.ordem} | ID: ${passo.id}`);
            
            await supabase.from('cronograma_passos').update({ status_passo: 'executando' }).eq('id', passo.id);
            await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'comando', codigo: EVENT_CODES.ETAPA_INICIADO });

            const velocidadeCalc = 50; 
            const direcaoModbus = passo.direcao === 'HORARIO' ? false : true;
            const bombaModbus = passo.irrigacao;

            await modbusWriteCoil(pivoId, COIL_START, false);
            await modbusWriteCoil(pivoId, COIL_DONE, false);
            await sleep(200);

            console.log(`[WORKER] Enviando parâmetros ao CLP...`);
            await modbusWriteRegister(pivoId, REG_ANG_INI, passo.angulo_inicial);
            await modbusWriteRegister(pivoId, REG_ANG_FIM, passo.angulo_final);
            await modbusWriteRegister(pivoId, REG_VELOCIDADE, velocidadeCalc);
            
            await modbusWriteCoil(pivoId, COIL_DIRECAO, direcaoModbus);
            await modbusWriteCoil(pivoId, COIL_BOMBA, bombaModbus);
            
            await modbusWriteCoil(pivoId, COIL_START, true);
            await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'comando', codigo: EVENT_CODES.EXEC_INICIADA });
            await sleep(250);

            console.log(`[MONITORAMENTO INICIADO] Passo ID: ${passo.id}`);
            const startTime = Date.now();
            let stepConcluido = false;

            while (true) {
                const segundosPassados = Math.floor((Date.now() - startTime) / 1000);

                if (segundosPassados > TIMEOUT_SEGUNDOS) {
                    await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'erro', codigo: EVENT_CODES.CLP_TIMEOUT });
                    throw new Error("TIMEOUT_EXECUCAO");
                }

                const feedbackDone = await modbusReadCoils(pivoId, COIL_DONE, 1);
                const feedbackStart = await modbusReadCoils(pivoId, COIL_START, 1);
                
                if (feedbackDone.data[0] === true || feedbackStart.data[0] === false) {
                    await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'conclusao', codigo: EVENT_CODES.EXEC_FINALIZADA });
                    stepConcluido = true;
                    break;
                }

                await sleep(150); 
            }

            if (stepConcluido) {
                await supabase.from('cronograma_passos').update({ status_passo: 'concluido' }).eq('id', passo.id);
                await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'conclusao', codigo: EVENT_CODES.ETAPA_FINALIZADO });
            }

        } catch (error: any) {
            await supabase.from('cronograma_passos').update({ status_passo: 'falha' }).eq('id', passo.id);
            await registrarEvento({ cronogramaId, cronogramaPassoId: passo.id, pivoId, tipoEvento: 'erro', codigo: EVENT_CODES.ETAPA_FALHA });
            throw error;
        } finally {
            await limparModbus(pivoId);
        }
    });
}

// ============================================================================
// PROCESSAMENTO DO CRONOGRAMA COMPLETO
// ============================================================================
async function processarCronograma(cronograma: any) {
    if (pivosEmExecucao.has(cronograma.pivo_id)) return;
    pivosEmExecucao.add(cronograma.pivo_id);

    try {
        console.log(`\n📅 [CRONOGRAMA INICIADO AGORA] ID: ${cronograma.id}`);
        await supabase.from('cronogramas').update({ status_final: 'executando' }).eq('id', cronograma.id);
        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'comando', codigo: EVENT_CODES.CRONOGRAMA_INICIADO });

        const { data: passos, error: errorPassos } = await supabase
            .from('cronograma_passos')
            .select('*')
            .eq('cronograma_id', cronograma.id)
            .order('ordem', { ascending: true });

        if (errorPassos || !passos || passos.length === 0) throw new Error("Nenhum passo encontrado.");

        for (let i = 0; i < passos.length; i++) {
            await executarPasso(passos[i]);

            if (i < passos.length - 1) {
                await sleep(TEMPO_ESPERA_ENTRE_PASSOS_MS);
            }
        }

        console.log(`\n🎉 [CRONOGRAMA CONCLUÍDO]`);
        await supabase.from('cronogramas').update({ status_final: 'concluido', is_ativo: false }).eq('id', cronograma.id);
        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'conclusao', codigo: EVENT_CODES.CRONOGRAMA_FINALIZADO });

    } catch (error: any) {
        console.error(`\n🚨 [ERRO CRÍTICO NO CRONOGRAMA] O cronograma ${cronograma.id} foi interrompido.`);
        
        await supabase.from('cronogramas').update({ status_final: 'falha', is_ativo: false }).eq('id', cronograma.id);
        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'erro', codigo: EVENT_CODES.CRONOGRAMA_FALHA });
        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'pausa_automatica', codigo: EVENT_CODES.PARADA_AUTOMATICA });
    } finally {
        pivosEmExecucao.delete(cronograma.pivo_id);
    }
}

// ============================================================================
// LOOP PRINCIPAL DO WORKER
// ============================================================================
async function buscarCronogramasAtivos() {
    const { data: cronogramas, error } = await supabase
        .from('cronogramas')
        .select('*')
        .eq('status_final', 'aguardando')
        .eq('is_ativo', true);

    if (error) return [];
    return cronogramas;
}

async function startWorker() {
    console.log("🚀 Worker de Auditoria Iniciado...");
    
    await supabase.from('cronogramas').update({ status_final: 'falha', is_ativo: false }).eq('status_final', 'executando');
    await supabase.from('cronograma_passos').update({ status_passo: 'falha' }).eq('status_passo', 'executando');
    
    while (true) {
        if (!workerExecutando) {
            workerExecutando = true;
            
            try {
                const pendentes = await buscarCronogramasAtivos();
                const agora = Date.now();
                
                for (const cronograma of pendentes) {
                    if (cronogramasEmProcessamento.has(cronograma.id)) continue;

                    let dataString = cronograma.horario_inicio;
                    const dataLimpa = dataString.replace(' ', 'T').substring(0, 19); 
                    const dataAgendada = new Date(dataLimpa);
                    const horarioAgendado = dataAgendada.getTime();
                    
                    if (isNaN(horarioAgendado)) continue;

                    const tempoRestante = horarioAgendado - agora;

                    if (tempoRestante <= 0) {
                        cronogramasEmProcessamento.add(cronograma.id);
                        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'alerta', codigo: EVENT_CODES.CRONOGRAMA_AGENDADO });
                        processarCronograma(cronograma).finally(() => cronogramasEmProcessamento.delete(cronograma.id));
                    } else if (tempoRestante <= JANELA_PRECISAO_MS) {
                        cronogramasEmProcessamento.add(cronograma.id);
                        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'alerta', codigo: EVENT_CODES.CRONOGRAMA_AGENDADO });
                        
                        setTimeout(() => {
                            processarCronograma(cronograma).finally(() => cronogramasEmProcessamento.delete(cronograma.id));
                        }, tempoRestante);
                    }
                }
            } catch (err: any) {
                await registrarEvento({ tipoEvento: 'erro', codigo: EVENT_CODES.ERRO_WORKER });
                console.error("\n[ERROR] Erro geral no ciclo do Worker:", err.message);
            } finally {
                workerExecutando = false;
            }
        }
        await sleep(5000); 
    }
}

startWorker();