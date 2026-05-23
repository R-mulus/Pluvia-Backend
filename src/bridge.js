import ModbusRTU from "modbus-serial";
import { SerialPort } from "serialport";
import { ReadlineParser } from '@serialport/parser-readline';
import readline from 'readline';

const CONFIG_FILE = './pid_config.json';

// Configuração com autoOpen: false para capturar e tratar erros de hardware
const arduino = new SerialPort({ path: 'COM5', baudRate: 115200, autoOpen: false });
const parser = arduino.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const client = new ModbusRTU();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const usarCLP = true; 
let sistemaOcupado = false; 



// CONSTANTES IMPORTANTES

const DIR_AUMENTA = 0;
const TAXA_DIR_AUMENTA = 12.0;  

const DIR_DIMINUI = 1;
const TAXA_DIR_DIMINUI = 6.2; 

const VELOCIDADE_MOTOR = 20;

let pidConfig = {
    anguloAbsoluto: 0, 
    inerciaMs: 25
};

let tarefaPendente = null;
let aguardandoAlinhamento = false;


// Tratamenteo de Erros de Conexão da Porta Serial
arduino.on('error', (err) => {
    console.log(`\x1b[31m[ERRO SERIAL] Falha crítica de comunicação: ${err.message}\x1b[0m`);
    if (err.message.includes('Access denied') || err.message.includes('Permission denied')) {
        console.log(`\x1b[33m[DICA DIAGNÓSTICA] A porta COM5 está presa! Verifique se:\x1b[0m`);
        console.log(`\x1b[33m 1. O Monitor Serial ou Serial Plotter do Arduino IDE está aberto.\x1b[0m`);
        console.log(`\x1b[33m 2. Há outra aba de terminal ativa rodando o bridge.js no seu computador.\x1b[0m`);
        console.log(`\x1b[33m 3. O COMMGR da Delta está tentando ler diretamente a serial do Arduino.\x1b[0m`);
    }
});

arduino.on('close', () => {
    console.log('\x1b[31m[SERIAL] Conexão com o Arduino foi fechada.\x1b[0m');
    setTimeout(conectarArduino, 5000); // Tenta restabelecer a comunicação se o cabo for desconectado
});

arduino.on('open', () => {
    console.log('\x1b[32m[ARDUINO] Conectado e ativo na COM5.\x1b[0m');
    console.log(`\x1b[33m[SISTEMA] Iniciado. Assumindo que o pivô está fisicamente em 0º por padrão.\x1b[0m`);



    // LOOP DE HEARTBEAT DE CONEXÃO (BRIDGE + COMMGR -> ARDUINO)
    setInterval(() => {
        if (arduino.isOpen) {
            if (client.isOpen) {
                // CLP ativo e porta serial aberta -> Informa status OK(1)
                arduino.write("<HB,1>\n");
            } else {
                // CLP offline -> Informa falha(0)
                arduino.write("<HB,0>\n");
            }
        }
    }, 2000);
});

function conectarArduino() {
    if (arduino.isOpen) return;
    
    console.log(`\x1b[35m[SERIAL] Tentando inicializar acesso à porta COM5...\x1b[0m`);
    arduino.open((err) => {
        if (err) {
            console.log(`\x1b[31m[FALHA DE INICIALIZAÇÃO] Não foi possível abrir COM5: ${err.message}\x1b[0m`);
            console.log(`\x1b[33m[SERIAL] Tentando reconexão automática em 5 segundos...\x1b[0m\n`);
            setTimeout(conectarArduino, 5000);
        }
    });
}

// Inicia o processo de conexão de forma assíncrona e segura
conectarArduino();


// Lógica de movimento do SERVO MOTOR
function alinharMotor(angDestino) {
    let distAumenta = (angDestino - pidConfig.anguloAbsoluto + 360) % 360;
    let distDiminui = (pidConfig.anguloAbsoluto - angDestino + 360) % 360;
    
    let dirAlinhamento = (distAumenta <= distDiminui) ? DIR_AUMENTA : DIR_DIMINUI;
    let distAlinhamento = (distAumenta <= distDiminui) ? distAumenta : distDiminui;

    const taxaAtual = (dirAlinhamento === DIR_AUMENTA) ? TAXA_DIR_AUMENTA : TAXA_DIR_DIMINUI;
    const tempoMs = Math.round(distAlinhamento * taxaAtual);

    console.log(`\x1b[35m[ALINHAMENTO] Posição atual: ${pidConfig.anguloAbsoluto}º | Alvo Inicial: ${angDestino}º\x1b[0m`);
    console.log(`\x1b[35m[ALINHAMENTO] Tomando a menor rota: ${distAlinhamento}º na Direção ${dirAlinhamento}.\x1b[0m`);
    
    aguardandoAlinhamento = true;
    const pacote = `<ALIGN,${angDestino},${VELOCIDADE_MOTOR},${dirAlinhamento},${tempoMs}>\n`;
    if (arduino.isOpen) {
        arduino.write(pacote);
    }
}

function executarTarefaPrincipal(tarefa) {
    let distancia = 0;
    
    if (tarefa.direcao === DIR_AUMENTA) { 
        distancia = (tarefa.angFinal - tarefa.angInicial + 360) % 360;
    } else { 
        distancia = (tarefa.angInicial - tarefa.angFinal + 360) % 360;
    }

    if (distancia === 0) {
         console.log(`\x1b[33m[CLP] Distância do comando é ZERO. Já no alvo (${tarefa.angFinal}º). Finalizando.\x1b[0m`);
         parser.emit('data', 'STANDBY\r\n'); 
         return;
    }

    const taxaAtual = (tarefa.direcao === DIR_AUMENTA) ? TAXA_DIR_AUMENTA : TAXA_DIR_DIMINUI;
    const tempoMs = Math.round((distancia * taxaAtual) + pidConfig.inerciaMs);

    console.log(`\x1b[34m[EXECUÇÃO] Iniciando Irrigação! De ${tarefa.angInicial}º para ${tarefa.angFinal}º (Direção: ${tarefa.direcao}). Distância: ${distancia}º = ${tempoMs} ms | Água: ${tarefa.bomba ? "LIGADA" : "DESLIGADA"}\x1b[0m`);
    
    const pacote = `<AUTO,${tarefa.angFinal},${VELOCIDADE_MOTOR},${tarefa.direcao},${tempoMs},${tarefa.bomba ? 1 : 0}>\n`;
    if (arduino.isOpen) {
        arduino.write(pacote);
    }
}


// RECEPÇÃO DO ARDUINO E MÁQUINA DE ESTADOS
parser.on('data', async (data) => {
    const msg = data.trim();
    
    if (msg.startsWith("[ARDUINO] Sistema Ativo")) return;

    console.log(`\x1b[36m[ARDUINO] ${msg}\x1b[0m`);

    if ((msg === 'STANDBY' || msg.startsWith('[PID_FEEDBACK]')) && sistemaOcupado) {
        if (aguardandoAlinhamento) {
            aguardandoAlinhamento = false;
            pidConfig.anguloAbsoluto = tarefaPendente.angInicial; 
            
            console.log(`\x1b[32m[SISTEMA] Alinhamento concluído. O pivô está na posição exata de ${pidConfig.anguloAbsoluto}º.\x1b[0m`);
            console.log(`\x1b[33m[SISTEMA] Aguardando 3 segundos de estabilização antes de iniciar a irrigação...\x1b[0m`);
            
            setTimeout(() => {
                executarTarefaPrincipal(tarefaPendente);
            }, 3000);
            
        } else {
            if (tarefaPendente) {
                pidConfig.anguloAbsoluto = tarefaPendente.angFinal; 
                tarefaPendente = null;
            }
            
            console.log(`\x1b[32m[SISTEMA] Comando Automático concluído com sucesso. Posição atualizada: ${pidConfig.anguloAbsoluto}º.\x1b[0m`);
            
            if (usarCLP && client.isOpen) {
                try {
                    await client.writeCoil(0, false); // M0: Desliga Gatilho de partida
                    await client.writeCoil(10, true); // M10: Liga Feedback de término para o worker.ts
                    
                    // CORREÇÃO: Envolvendo o setTimeout em try/catch interno para evitar quedas por erros assíncronos
                    setTimeout(async () => {
                        if (client.isOpen) {
                            try {
                                await client.writeCoil(10, false);
                            } catch (err) {
                                console.log(`\x1b[31m[MODBUS ERRO TEMPORIZADO] Erro ao desligar M10 após atraso: ${err.message}\x1b[0m`);
                                tratarErroModbus(err);
                            }
                        }
                    }, 2000);
                } catch (e) {
                    console.log(`\x1b[31m[MODBUS ERRO] Falha ao comunicar com CLP no término: ${e.message}\x1b[0m`);
                    tratarErroModbus(e);
                }
            }
            sistemaOcupado = false; 
        }
    }
    
    if (msg === '[SYS] FREE_STOP' || msg === 'LIVRE') {
        sistemaOcupado = false;
        console.log(`\x1b[35m[SISTEMA] Movimento Manual (JOG) ou Parada de Emergência Concluída.\x1b[0m`);
    }
});



// CLI INTERATIVO (MANUAL TERMINAL)

rl.on('line', (input) => {
    const args = input.trim().split(' ');
    const cmd = args[0].toUpperCase();

    if (cmd === 'SET_POS' && args.length === 2) {
        pidConfig.anguloAbsoluto = parseInt(args[1]);
        if (arduino.isOpen) {
            arduino.write(`<SET_POS,${pidConfig.anguloAbsoluto}>\n`); 
        }
        console.log(`\x1b[32m[MEMÓRIA] O sistema agora sabe que o servo está fisicamente no ângulo ${pidConfig.anguloAbsoluto}º\x1b[0m`);
        return;
    }

    if (cmd === 'FREE' && args.length === 4) {
        const vel = parseInt(args[1]);
        const tempoMs = parseInt(args[2]);
        const dir = parseInt(args[3]);
        
        sistemaOcupado = true;
        if (arduino.isOpen) {
            arduino.write(`<FREE,${vel},${tempoMs},${dir}>\n`);
        }
        console.log(`\x1b[35m[JOG MANUAL] Mandando Arduino ligar a ${vel}% por ${tempoMs}ms na direção ${dir}\x1b[0m`);
        return;
    }

    if (cmd === 'STOP') { 
        if (arduino.isOpen) {
            arduino.write(`<FREE>\n`); 
        }
        sistemaOcupado = false; 
        return; 
    }
    console.log("Comandos: SET_POS <angulo> | FREE <vel> <ms> <dir> | STOP");
});


// FUNÇÃO AUXILIAR DE DIAGNÓSTICO MODBUS
function tratarErroModbus(error) {
    if (error.message.includes("exception 7") || error.message.includes("Negative acknowledge")) {
        console.log(`\x1b[33m[DIAGNÓSTICO] O CLP recusou a operação (Erro 7). Certifique-se de que:\x1b[0m`);
        console.log(`\x1b[33m -> O seu simulador no ISPSoft / COMMGR está em modo RUN (Ativo).\x1b[0m`);
        console.log(`\x1b[33m -> Se o CLP estiver em STOP, ele bloqueia a escrita externa nas memórias.\x1b[0m`);
    }
}


// LOOP MODBUS TCP
async function iniciarModbus() {
    if (!usarCLP) return;

    try {
        await client.connectTCP("127.0.0.1", { port: 10003 });
        client.setID(1); 
        console.log("\x1b[32m[MODBUS] Conectado ao Simulador CLP (COMMGR)\x1b[0m");

        // Loop de varredura com captura de exceções à prova de crashes
        setInterval(async () => {
            if (sistemaOcupado) return; 

            try {
                if (!client.isOpen) return;

                const coils = await client.readCoils(0, 3);
                
                if (coils.data[0]) { // Se M0 (Gatilho) for verdadeiro
                    const bombaAtiva = coils.data[1]; // M1: Estado da Irrigação solicitado pelo Worker
                    const direcaoCorrigida = coils.data[2] ? 1 : 0; // M2: Direção do percurso

                    // Lê a tabela de registradores de 32-bits (D100 e D102)
                    const regs = await client.readHoldingRegisters(100, 6); 
                    const angInicial = regs.data[0] + regs.data[1];
                    const angFinal = regs.data[2] + regs.data[3];

                    console.log(`\x1b[33m[CLP] NOVO COMANDO! Início pedido: ${angInicial}º | Fim: ${angFinal}º | Direção: ${direcaoCorrigida} | Água: ${bombaAtiva}\x1b[0m`);

                    tarefaPendente = { angInicial, angFinal, direcao: direcaoCorrigida, bomba: bombaAtiva };
                    sistemaOcupado = true; 

                    // LÓGICA DE ALINHAMENTO ABSOLUTO (IMPORTANTE) --------------------------------------------------------------------------------------
                    if (pidConfig.anguloAbsoluto !== angInicial) {
                        alinharMotor(angInicial);
                    } else {
                        console.log(`\x1b[32m[SISTEMA] Motor já está no ponto inicial correto (${angInicial}º). Pulando etapa de alinhamento.\x1b[0m`);
                        executarTarefaPrincipal(tarefaPendente);
                    }
                    // ----------------------------------------------------------------------------------------------------------------------------------
                }
            } catch (e) {
                console.log(`\x1b[31m[MODBUS LOOP ERROR] Falha na leitura cíclica: ${e.message}\x1b[0m`);
                tratarErroModbus(e);
            }
        }, 500);

    } catch (e) {
        console.log(`\x1b[31m[MODBUS OFFLINE] Tentando reconectar ao COMMGR em 5s. Motivo: ${e.message}\x1b[0m`);
        setTimeout(iniciarModbus, 5000);
    }
}
//seila
iniciarModbus();