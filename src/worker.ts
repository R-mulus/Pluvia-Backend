import 'dotenv/config';
import { supabase } from './config/supabase.js';
import ModbusRTU from 'modbus-serial';

const client = new (ModbusRTU as any)();

// --- MAPA DE MEMÓRIA MODBUS (DELTA) ---
const PLC_CONFIG = { host: "127.0.0.1", port: 10003 };
const STATION_ID = 1;

// Bobinas (Coils - bits)
const COIL_START = 0;      // M0: Gatilho principal de arranque
const COIL_BOMBA = 1;      // M1: 1=Água Ligada, 0=Seco
const COIL_DIRECAO = 2;    // M2: 0=Horário, 1=Anti-Horário
const COIL_DONE = 10;      // M10: Feedback do CLP (Fim de Ciclo)

// Registos (Holding Registers - 16 bits)
const REG_ANG_INI = 100;   // D100: Ângulo de Início
const REG_ANG_FIM = 102;   // D102: Ângulo Final
const REG_VELOCIDADE = 104;// D104: Percentímetro (Velocidade)
const REG_ANG_ATUAL = 200; // D200: Falso Encoder (Ângulo em tempo real)

async function garantirConexao() {
    if (!client.isOpen) {
        try {
            await client.connectTCP(PLC_CONFIG.host, { port: PLC_CONFIG.port });
            client.setID(STATION_ID);
            console.log("======================================");
            console.log("   [MODBUS] Conectado ao CLP Delta!   ");
            console.log("======================================");
        } catch (err: any) {
            console.error("[ERROR] Erro ao ligar ao CLP:", err.message);
        }
    }
}

async function startWorker() {
    console.log("[WORKER] Worker Pluvia iniciado (Modo Edge). A monitorizar o cronograma...");
    
    setInterval(async () => {
        const agora = new Date();
        const horaLog = agora.toLocaleTimeString('pt-PT');
        const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

        process.stdout.write(`\r[${horaLog}] A verificar agendamentos no Supabase...`);

        try {
            await garantirConexao();

            const { data: tarefas, error } = await supabase
                .from('cronograma')
                .select('*')
                .eq('status_final', 'aguardando');

            if (error) return console.error("\n[ERROR] Erro no Supabase:", error.message);
            if (!tarefas || tarefas.length === 0) return;

            for (const tarefa of tarefas) {
                const match = (tarefa.horario || "").match(/(\d{2}:\d{2})/);
                const hBanco = match ? match[1] : "";

                if (hBanco === horaAtual) {
                    console.log(`\n\n[STATUS] HORÁRIO ATINGIDO (${horaAtual})! A iniciar Tarefa ID: ${tarefa.id}`);

                    // 1. Bloqueia a tarefa para evitar duplicação
                    await supabase.from('cronograma').update({ status_final: 'executando' }).eq('id', tarefa.id);

                    const cmd = typeof tarefa.comando === 'string' ? JSON.parse(tarefa.comando) : tarefa.comando;

                    if (client.isOpen) {
                        console.log("[MODBUS] A injetar parâmetros na memória do CLP...");
                        
                        // 2. Escreve os parâmetros na memória (Setup Físico)
                        await client.writeCoil(COIL_BOMBA, cmd.irrigacao === true);
                        await client.writeCoil(COIL_DIRECAO, cmd.direcao === 'ANTI_HORARIO');
                        await client.writeRegister(REG_ANG_INI, cmd.angulo_inicial);
                        await client.writeRegister(REG_ANG_FIM, cmd.angulo_final);
                        await client.writeRegister(REG_VELOCIDADE, cmd.percentimetro);
                        
                        // NOVIDADE: Iguala o D200 ao D100 para o CLP saber de onde começar a contar!
                        await client.writeRegister(REG_ANG_ATUAL, cmd.angulo_inicial);

                        console.log(`Dados Injetados: Água=${cmd.irrigacao}, Dir=${cmd.direcao}, Vel=${cmd.percentimetro}%`);
                        console.log(`Rota: ângulo ${cmd.angulo_inicial}° até ângulo ${cmd.angulo_final}°`);

                        // 3. Dispara o M0 (Gatilho de Ação)
                        await client.writeCoil(COIL_START, true);
                        console.log("[MODBUS] Gatilho M0 ativado! O CLP assumiu a matemática do percurso.");

                        // 4. Monitoriza o feedback M10 do CLP
                        let segundosPassados = 0;
                        const monitor = setInterval(async () => {
                            try {
                                const res = await client.readCoils(COIL_DONE, 1);
                                segundosPassados++;

                                if (res.data[0] === true) {
                                    console.log(`\n[MODBUS] Feedback M10 recebido! O CLP terminou a operação.`);
                                    
                                    // Atualiza na base de dados
                                    await supabase.from('cronograma').update({ status_final: 'concluido' }).eq('id', tarefa.id);
                                    
                                    // Limpa o CLP para o próximo ciclo
                                    await client.writeCoil(COIL_START, false);
                                    await client.writeCoil(COIL_DONE, false); 
                                    console.log(`[MODBUS] Memórias de controlo limpas.`);
                                    
                                    clearInterval(monitor);
                                }

                                if (segundosPassados > 300) {
                                    console.warn("\n[TIMEOUT] O CLP demorou muito a responder. A abortar monitorização.");
                                    await supabase.from('cronograma').update({ status_final: 'falha' }).eq('id', tarefa.id);
                                    clearInterval(monitor);
                                }
                            } catch (e) {
                                // Ignora erros de leitura de rede temporários
                            }
                        }, 1000);
                    }
                }
            }
        } catch (err: any) {
            console.error("\n[ERROR] Erro no Worker:", err.message);
        }
    }, 10000); 
}

startWorker();