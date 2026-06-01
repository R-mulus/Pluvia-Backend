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
const JANELA_PRECISAO_MS = 60000; // Janela de 1 minuto

const client = new (ModbusRTU as any)();

// --- SISTEMA DE LOCKS E ESTADOS ---
let workerExecutando = false;
let sistemaOciosoConfirmado = false; 
const pivosEmExecucao = new Set<string>();
const cronogramasEmProcessamento = new Set<string>(); 

// NOVO: Set exclusivo para logs detalhados sem poluir o terminal a cada 5 segundos
const cronogramasDiagnosticados = new Set<string>(); 
let modbusConectado = false;

// --- TIPAGEM DE STATUS ---
type StatusExecucao = 'aguardando' | 'executando' | 'concluido' | 'falha' | 'cancelado' | 'interrompido';

// --- UTILITÁRIOS ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- CONEXÃO MODBUS ---
async function conectarModbus() {
    if (modbusConectado) return true;
    
    // Captura o tempo antes de tentar a conexão
    const tempoInicio = Date.now();
    
    try {
        await client.connectTCP(PLC_CONFIG.host, { port: PLC_CONFIG.port });
        client.setID(STATION_ID);
        client.setTimeout(2000);
        modbusConectado = true;
        
        // Calcula quanto tempo demorou para o CLP responder
        const latenciaCalculada = Date.now() - tempoInicio;
        
        console.log(`[\x1b[32mMODBUS\x1b[0m] Conectado ao CLP/COMMGR em ${PLC_CONFIG.host}:${PLC_CONFIG.port} (Latência: ${latenciaCalculada}ms)`);
        
        // Envia statusConexao E latenciaMs
        await registrarConexao({ statusConexao: true, latenciaMs: latenciaCalculada });
        
        return true;
    } catch (error) {
        console.error(`[\x1b[31mERRO\x1b[0m] Falha ao conectar no Modbus:`, error);
        modbusConectado = false;
        
        await registrarConexao({ statusConexao: false, latenciaMs: 0 });
        
        return false;
    }
}

// --- FUNÇÕES MODBUS WRAPPERS ---
async function modbusWriteCoil(pivoId: string, address: number, state: boolean): Promise<boolean> {
    if (!await conectarModbus()) return false;
    try {
        await client.writeCoil(address, state);
        await sleep(50); 
        return true;
    } catch (e) {
        console.error(`[MODBUS ERROR] Falha ao escrever Coil ${address}:`, e);
        return false;
    }
}

async function modbusWriteRegister(pivoId: string, address: number, value: number): Promise<boolean> {
    if (!await conectarModbus()) return false;
    try {
        await client.writeRegister(address, value);
        await sleep(50);
        return true;
    } catch (e) {
        console.error(`[MODBUS ERROR] Falha ao escrever Registro ${address}:`, e);
        return false;
    }
}

async function modbusReadCoils(pivoId: string, address: number, length: number): Promise<boolean[] | null> {
    if (!await conectarModbus()) return null;
    try {
        const response = await client.readCoils(address, length);
        return response.data;
    } catch (e) {
        return null;
    }
}

// ============================================================================
// FUNÇÕES DE ATUALIZAÇÃO DE ESTADO NO BANCO DE DADOS
// ============================================================================

/**
 * Atualiza o status geral de um cronograma e, opcionalmente, o seu estado de atividade.
 */
async function atualizarStatusCronograma(id: string, status: StatusExecucao, isAtivo?: boolean) {
    try {
        const payload: any = { status_final: status };
        if (isAtivo !== undefined) {
            payload.is_ativo = isAtivo;
        }
        
        const { error } = await supabase.from('cronogramas').update(payload).eq('id', id);
        if (error) console.error(`[\x1b[31mDB ERRO\x1b[0m] Falha ao atualizar cronograma ${id}:`, error.message);
    } catch (err: any) {
        console.error(`[\x1b[31mDB EXCEPTION\x1b[0m] Exceção ao atualizar cronograma ${id}:`, err.message);
    }
}

/**
 * Atualiza o status individual de um passo do cronograma.
 */
async function atualizarStatusPasso(id: string, status: StatusExecucao) {
    try {
        const { error } = await supabase.from('cronograma_passos').update({ status_passo: status }).eq('id', id);
        if (error) console.error(`[\x1b[31mDB ERRO\x1b[0m] Falha ao atualizar passo ${id}:`, error.message);
    } catch (err: any) {
        console.error(`[\x1b[31mDB EXCEPTION\x1b[0m] Exceção ao atualizar passo ${id}:`, err.message);
    }
}

// ============================================================================
// LÓGICA DE LIMPEZA PRECISA E MINIMALISTA
// ============================================================================
async function executarLimpezaProfundaCLP(pivoId: string, contexto: string) {
    console.log(`\n[\x1b[33mLIMPEZA\x1b[0m] Iniciando limpeza de memória do CLP (${contexto})...`);
    try {
        if (!await conectarModbus()) return;

        // 1. Zera Registradores
        await modbusWriteRegister(pivoId, REG_ANG_INI, 0);
        await modbusWriteRegister(pivoId, REG_ANG_FIM, 0);
        await modbusWriteRegister(pivoId, REG_VELOCIDADE, 0);
        console.log(`  └─ [\x1b[32mOK\x1b[0m] Registradores resetados (Ang Incial, Ang Final, Vel).`);
        await sleep(100);

        // 2. Zera Coils
        await modbusWriteCoil(pivoId, COIL_START, false);
        await modbusWriteCoil(pivoId, COIL_BOMBA, false);
        await modbusWriteCoil(pivoId, COIL_DIRECAO, false);
        await modbusWriteCoil(pivoId, COIL_DONE, false);
        console.log(`  └─ [\x1b[32mOK\x1b[0m] Coils limpos (M0, M1, M2, M10 forçados para FALSE).`);
        
        await sleep(250); 

        // 3. Validação de Standby e Confirmação de Limpeza
        const checkCoils = await modbusReadCoils(pivoId, COIL_START, 11);
        if (checkCoils && checkCoils[COIL_START] === false && checkCoils[COIL_DONE] === false) {
            console.log(`  └─ [\x1b[32mOK\x1b[0m] Confirmação do reset do coil M10 verificada no CLP.`);
            console.log(`[\x1b[36mSISTEMA\x1b[0m] Confirmação: Bridge totalmente liberada para novos comandos.\n`);
        } else {
            console.log(`  └─ [\x1b[31mAVISO\x1b[0m] Coils não confirmaram zero. Bridge pode apresentar instabilidade.\n`);
        }
    } catch (error: any) {
        console.error(`[\x1b[31mERRO\x1b[0m] Falha durante rotina de limpeza profunda: ${error.message}\n`);
    }
}

// --- LÓGICA DE EXECUÇÃO ---

async function executarPasso(passo: any, pivoId: string, cronogramaId: string) {
    console.log(`\n[\x1b[35mEXECUTANDO\x1b[0m] Iniciando Passo ${passo.ordem} do Cronograma ${cronogramaId}`);
    
    // Atualiza status do passo no banco para executando
    await atualizarStatusPasso(passo.id, 'executando');

    await modbusWriteCoil(pivoId, COIL_START, false);
    await modbusWriteCoil(pivoId, COIL_DONE, false);
    await sleep(200);

    await modbusWriteRegister(pivoId, REG_ANG_INI, passo.angulo_inicial);
    await modbusWriteRegister(pivoId, REG_ANG_FIM, passo.angulo_final);
    await modbusWriteRegister(pivoId, REG_VELOCIDADE, passo.percentimetro);
    
    const direcaoBit = (passo.direcao === 'REVERSO' || passo.direcao === 'ANTI_HORARIO') ? true : false; //Nome no banco pode ser tanto ANTI_HORARIO quanto REVERSO
    await modbusWriteCoil(pivoId, COIL_DIRECAO, direcaoBit);
    await modbusWriteCoil(pivoId, COIL_BOMBA, passo.irrigacao);

    await modbusWriteCoil(pivoId, COIL_START, true);
    console.log(`[\x1b[32mENVIADO\x1b[0m] Parâmetros gravados. Gatilho M0 ativado.`);

    const tempoInicio = Date.now();
    let passoConcluido = false;
    
    // --- PROBLEMA 2: AJUSTES PRECISOS NO POLLING DO M10 ---
    let ultimoEstadoM10: boolean | null = null;
    let leituras = 0;
    console.log(`[\x1b[36mPOLLING\x1b[0m] Início do polling no coil M10. Frequência reajustada: 20ms...`);

    while (!passoConcluido) {
        const tempoAtual = Date.now();
        if ((tempoAtual - tempoInicio) > (TIMEOUT_SEGUNDOS * 1000)) {
            console.error(`[\x1b[31mTIMEOUT\x1b[0m] Falha no M10! Timeout atingido após ${TIMEOUT_SEGUNDOS}s.`);
            console.log(`  └─ Total de leituras falhas: ${leituras}`);
            
            // Registra a falha no banco de dados para este passo antes de jogar o Erro para cima
            await atualizarStatusPasso(passo.id, 'falha');
            throw new Error(`Timeout no Passo ${passo.ordem}`);
        }

        const statusDone = await modbusReadCoils(pivoId, COIL_DONE, 1);
        leituras++;

        if (statusDone !== null) {
            const estadoAtual = statusDone[0] ?? false;

            if (estadoAtual !== ultimoEstadoM10) {
                console.log(`  └─ [\x1b[33mMUDANÇA M10\x1b[0m] Valor lido do M10 mudou: ${ultimoEstadoM10} -> ${estadoAtual} (Leitura #${leituras})`);
                ultimoEstadoM10 = estadoAtual;
            }

            if (estadoAtual === true) {
                passoConcluido = true;
                const tempoGasto = tempoAtual - tempoInicio;
                console.log(`[\x1b[32mSUCESSO\x1b[0m] Confirmação de conclusão recebida! (Tempo total: ${tempoGasto}ms | Leituras: ${leituras})`);
                
                // Conclui o passo no banco de dados
                await atualizarStatusPasso(passo.id, 'concluido');

                await executarLimpezaProfundaCLP(pivoId, `Pós-Passo ${passo.ordem}`);
                break;
            }
        }

        await sleep(20); 
    }
}

async function processarCronograma(cronograma: any) {
    pivosEmExecucao.add(cronograma.pivo_id);
    console.log(`\n======================================================`);
    console.log(`[\x1b[36mCRONOGRAMA\x1b[0m] Iniciando Cronograma ID: ${cronograma.id}`);
    
    try {
        // Marca o Cronograma como em andamento
        await atualizarStatusCronograma(cronograma.id, 'executando');

        const { data: passos, error } = await supabase
            .from('cronograma_passos')
            .select('*')
            .eq('cronograma_id', cronograma.id)
            .order('ordem', { ascending: true });

        if (error || !passos || passos.length === 0) throw new Error("Nenhum passo encontrado");

        for (let i = 0; i < passos.length; i++) {
            await executarPasso(passos[i], cronograma.pivo_id, cronograma.id);
            
            if (i < passos.length - 1) {
                console.log(`[\x1b[33mAGUARDANDO\x1b[0m] Pausa entre passos (${TEMPO_ESPERA_ENTRE_PASSOS_MS}ms)...`);
                await sleep(TEMPO_ESPERA_ENTRE_PASSOS_MS);
            }
        }

        // Finaliza cronograma com sucesso, marcando-o como concluído e definindo "is_ativo" como FALSE
        await atualizarStatusCronograma(cronograma.id, 'concluido', false);
        console.log(`[\x1b[32mCONCLUÍDO\x1b[0m] Cronograma ${cronograma.id} finalizado com sucesso!`);
        
        await executarLimpezaProfundaCLP(cronograma.pivo_id, "Fim de Cronograma");

    } catch (err: any) {
        console.error(`[\x1b[31mFALHA\x1b[0m] Erro no Cronograma ${cronograma.id}:`, err.message);
        
        // Em caso de falha/timeout, marca como falho e encerra (is_ativo = false)
        await atualizarStatusCronograma(cronograma.id, 'falha', false);
        await registrarEvento({ tipoEvento: 'erro', codigo: EVENT_CODES.ERRO_WORKER });
        
        await executarLimpezaProfundaCLP(cronograma.pivo_id, "Falha/Aborto");

    } finally {
        pivosEmExecucao.delete(cronograma.pivo_id);
    }
}

// --- LOOP PRINCIPAL ---

async function iniciarWorker() {
    console.log("[\x1b[36mPLUVIA WORKER\x1b[0m] Inicializado. Aguardando cronogramas...");
    await conectarModbus();

    while (true) {
        if (!workerExecutando) {
            workerExecutando = true;
            try {
                if (cronogramasEmProcessamento.size === 0 && pivosEmExecucao.size === 0) {
                    if (!sistemaOciosoConfirmado) {
                        console.log(`\n[\x1b[36mSTANDBY\x1b[0m] Sistema ocioso. Nenhuma tarefa pendente.`);
                        await executarLimpezaProfundaCLP("N/A", "Preventiva em Idle");
                        sistemaOciosoConfirmado = true; 
                    }
                } else {
                    sistemaOciosoConfirmado = false; 
                }

                // O relógio atual da máquina local em milissegundos
                const agora = Date.now();

                const { data: cronogramas, error } = await supabase
                    .from('cronogramas')
                    .select('*')
                    .eq('is_ativo', true)
                    .eq('status_final', 'aguardando');

                if (error) throw error;

                for (const cronograma of cronogramas || []) {
                    if (cronogramasEmProcessamento.has(cronograma.id)) continue;
                    if (pivosEmExecucao.has(cronograma.pivo_id)) continue;

                    // --- SOLUÇÃO CIRÚRGICA DE FUSO HORÁRIO ---
                    // Remove silenciosamente as tags de fuso horário da string ("Z" ou "+00:00")
                    // Ex: '2026-05-29T16:18:00+00:00' vira '2026-05-29T16:18:00'
                    // Isso obriga o JS a interpretar o 16:18 como horário local, alinhando com o Date.now().
                    const dataStringLimpa = cronograma.horario_inicio.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
                    const horarioAgendado = new Date(dataStringLimpa).getTime();
                    
                    if (isNaN(horarioAgendado)) continue;

                    const tempoRestante = horarioAgendado - agora;

                    // Exibe a análise profunda apenas 1x
                    if (!cronogramasDiagnosticados.has(cronograma.id)) {
                        console.log(`\n======================================================`);
                        console.log(`[\x1b[36mANÁLISE DE AGENDAMENTO\x1b[0m] Identificado novo cronograma.`);
                        console.log(`  └─ ID: ${cronograma.id}`);
                        console.log(`  └─ Horário Atual (Local da Máquina): ${new Date(agora).toLocaleString()}`);
                        console.log(`  └─ Horário Banco (Corrigido para Local): ${new Date(horarioAgendado).toLocaleString()}`);
                        console.log(`  └─ Delay Calculado (Corrigido): ${tempoRestante}ms`);
                        cronogramasDiagnosticados.add(cronograma.id);

                        if (tempoRestante < 0) {
                            console.log(`  └─ \x1b[31mAVISO:\x1b[0m Este cronograma está atrasado/expirado. A execução será ativada IMEDIATAMENTE.`);
                        } else if (tempoRestante > JANELA_PRECISAO_MS) {
                            console.log(`  └─ \x1b[34mSTATUS:\x1b[0m Cronograma no futuro (> 1 min). O Worker aguardará silenciosamente.`);
                        }
                    }

                    if (tempoRestante <= 0) {
                        cronogramasEmProcessamento.add(cronograma.id);
                        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'alerta', codigo: EVENT_CODES.CRONOGRAMA_AGENDADO });
                        
                        console.log(`\n[\x1b[32mDISPARO\x1b[0m] Momento de início real atingido. Iniciando ${cronograma.id} AGORA.`);
                        processarCronograma(cronograma).finally(() => cronogramasEmProcessamento.delete(cronograma.id));
                        
                    } else if (tempoRestante <= JANELA_PRECISAO_MS) {
                        cronogramasEmProcessamento.add(cronograma.id);
                        await registrarEvento({ cronogramaId: cronograma.id, pivoId: cronograma.pivo_id, tipoEvento: 'alerta', codigo: EVENT_CODES.CRONOGRAMA_AGENDADO });
                        
                        console.log(`\n[\x1b[33mAGENDADO\x1b[0m] Cronograma ${cronograma.id} entrou na janela de precisão (< 1 min).`);
                        console.log(`  └─ Aguardando exatos ${tempoRestante}ms (delay) para o disparo perfeito.`);
                        
                        setTimeout(() => {
                            console.log(`[\x1b[32mDISPARO TIMER\x1b[0m] Timeout concluído. Iniciando cronograma ${cronograma.id}.`);
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

// Inicia a aplicação
iniciarWorker();