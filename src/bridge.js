// DICA: O Polling não funciona muito bem, as veze vc tem q dar um STOP e RUN no ISPsoft pra limpar a memória do coil M0
// - Larápio

import ModbusRTU from "modbus-serial";
import { SerialPort } from "serialport";
import { ReadlineParser } from '@serialport/parser-readline';
import readline from 'readline';

const CONFIG_FILE = './pid_config.json';

const arduino = new SerialPort({ path: 'COM5', baudRate: 115200, autoOpen: false });
const parser = arduino.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const client = new ModbusRTU();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const usarCLP = true; 
let sistemaOcupado = false; 
let timeoutSeguranca = null; 

// VARIÁVEIS DE FÍSICA E MAPEAMENTO ESTRUTURAL -----------

const DIR_AUMENTA = 0;
// Legado mantido para retrocompatibilidade
let TAXA_DIR_AUMENTA = 10.4; 

const DIR_DIMINUI = 1;
// Legado mantido para retrocompatibilidade
let TAXA_DIR_DIMINUI = 8; 

let VELOCIDADE_MOTOR = 30; 

// =========================================================================
// NOVO: DICIONÁRIO DE CONSTANTES (CALIBRAÇÃO POR INTERVALO ANGULAR FÍSICO)
// =========================================================================
const CALIBRACAO_ROTACAO = {
    [DIR_AUMENTA]: { // Sentido Horário
        "0_90": 10,
        "90_180": 12.6,
        "180_270": 11,
        "270_360": 10
    },
    [DIR_DIMINUI]: { // Sentido Anti-Horário
        "0_90": 10,
        "90_180": 10,
        "180_270": 10,
        "270_360": 8
    }
};

let pidConfig = {
    anguloAbsoluto: 0.0, 
    inerciaMs: 25,       
    folgaReversaoMs: 40, 
    ultimaDirecao: null  
};

let tarefaPendente = null;
let alinhamentoPendente = null; 
let aguardandoAlinhamento = false;

// -----------------------------------

arduino.on('error', (err) => {
    console.log(`\x1b[31m[ERRO SERIAL] Falha crítica de comunicação: ${err.message}\x1b[0m`);
    if (err.message.includes('Access denied') || err.message.includes('Permission denied')) {
        console.log(`\x1b[33m[DICA DIAGNÓSTICA] A porta COM5 está presa!\x1b[0m`);
    }
});

arduino.on('close', () => {
    console.log('\x1b[31m[SERIAL] Conexão com o Arduino foi fechada.\x1b[0m');
    setTimeout(conectarArduino, 5000); 
});

arduino.on('open', () => {
    console.log('\x1b[32m[ARDUINO] Conectado e ativo na COM5.\x1b[0m');
    console.log(`\x1b[33m[SISTEMA] Iniciado. Assumindo pivô em 0.0º\x1b[0m`);

    setInterval(() => {
        if (arduino.isOpen) {
            if (client.isOpen) arduino.write("<HB,1>\n");
            else arduino.write("<HB,0>\n");
        }
    }, 2000);
});

function conectarArduino() {
    if (arduino.isOpen) return;
    console.log(`\x1b[35m[SERIAL] Tentando inicializar acesso à porta COM5...\x1b[0m`);
    arduino.open((err) => {
        if (err) {
            console.log(`\x1b[31m[FALHA DE INICIALIZAÇÃO] Não foi possível abrir COM5: ${err.message}\x1b[0m`);
            setTimeout(conectarArduino, 5000);
        }
    });
}
conectarArduino();


// =========================================================================
// HELPER AUXILIAR: CÁLCULO PROPORCIONAL BASEADO EM MAPEAMENTO FÍSICO
// =========================================================================
function calcularTempoFisico(anguloAtual, distanciaTotal, direcao) {
    let tempoTotalBruto = 0;
    let grausRestantes = distanciaTotal;
    let anguloCursor = anguloAtual;
    let logsSegmentos = [];

    // Fatiar a rota em pedaços baseados nos quadrantes físicos
    while (grausRestantes > 0.0001) {
        let angNormalized = (anguloCursor % 360 + 360) % 360;
        let segmentoAtual;
        let limiteAumenta, limiteDiminui;

        // Detectar quadrante
        if (angNormalized >= 0 && angNormalized < 90) {
            segmentoAtual = "0_90"; limiteAumenta = 90; limiteDiminui = 0;
        } else if (angNormalized >= 90 && angNormalized < 180) {
            segmentoAtual = "90_180"; limiteAumenta = 180; limiteDiminui = 90;
        } else if (angNormalized >= 180 && angNormalized < 270) {
            segmentoAtual = "180_270"; limiteAumenta = 270; limiteDiminui = 180;
        } else {
            segmentoAtual = "270_360"; limiteAumenta = 360; limiteDiminui = 270;
        }

        let grausNesteSegmento = 0;
        if (direcao === DIR_AUMENTA) {
            grausNesteSegmento = limiteAumenta - angNormalized;
        } else { // DIR_DIMINUI
            grausNesteSegmento = angNormalized - limiteDiminui;
            // Hack para caso bata na borda exata enquanto recua
            if (grausNesteSegmento === 0) { 
                grausNesteSegmento = 90;
                if (segmentoAtual === "0_90") segmentoAtual = "270_360";
                else if (segmentoAtual === "90_180") segmentoAtual = "0_90";
                else if (segmentoAtual === "180_270") segmentoAtual = "90_180";
                else if (segmentoAtual === "270_360") segmentoAtual = "180_270";
            }
        }

        // Determinar quanto pode mover neste segmento
        let grausParaMover = Math.min(grausRestantes, grausNesteSegmento);
        let taxaAplicada = CALIBRACAO_ROTACAO[direcao][segmentoAtual];

        tempoTotalBruto += grausParaMover * taxaAplicada;
        grausRestantes -= grausParaMover;

        // Avançar o cursor virtual
        if (direcao === DIR_AUMENTA) {
            anguloCursor += grausParaMover;
        } else {
            anguloCursor -= grausParaMover;
        }

        logsSegmentos.push(`${grausParaMover.toFixed(1)}º no [${segmentoAtual}] @ ${taxaAplicada}ms/g`);
    }

    let taxaMedia = distanciaTotal > 0 ? tempoTotalBruto / distanciaTotal : 0;
    return { tempoTotalBruto, taxaMedia, logsSegmentos };
}
// =========================================================================


// LÓGICA FÍSICA FINA DE ALINHAMENTO DO MOTOR
function alinharMotor(angDestino) {
    let distAumenta = (angDestino - pidConfig.anguloAbsoluto + 360) % 360;
    let distDiminui = (pidConfig.anguloAbsoluto - angDestino + 360) % 360;
    
    let dirAlinhamento = (distAumenta <= distDiminui) ? DIR_AUMENTA : DIR_DIMINUI;
    let distancia = Math.min(distAumenta, distDiminui);

    // Substituição pela Nova Lógica de Dicionário
    const calc = calcularTempoFisico(pidConfig.anguloAbsoluto, distancia, dirAlinhamento);
    let tempoBruto = calc.tempoTotalBruto;
    let taxaMedia = calc.taxaMedia;
    
    let tempoCorrigido = tempoBruto - pidConfig.inerciaMs; 
    if (tempoCorrigido < 0) tempoCorrigido = 0;

    let tempoComFolga = tempoCorrigido;
    let aplicouFolga = false;
    if (pidConfig.ultimaDirecao !== null && pidConfig.ultimaDirecao !== dirAlinhamento) {
        tempoComFolga += pidConfig.folgaReversaoMs;
        aplicouFolga = true;
    }

    const tempoMs = Math.round(tempoComFolga);

    let tempoDeMovimentoReal = tempoMs;
    if (aplicouFolga) tempoDeMovimentoReal -= pidConfig.folgaReversaoMs;
    tempoDeMovimentoReal += pidConfig.inerciaMs; 

    alinhamentoPendente = { direcao: dirAlinhamento, distanciaReal: tempoDeMovimentoReal / taxaMedia };
    aguardandoAlinhamento = true;

    console.log(`\n\x1b[35m=== [ALINHAMENTO DETALHADO] ===\x1b[0m`);
    console.log(` -> Direção Utilizada: ${dirAlinhamento === DIR_AUMENTA ? 'HORÁRIO (Aumenta)' : 'ANTI-HORÁRIO (Diminui)'}`);
    console.log(` -> Ângulo Inicial: ${pidConfig.anguloAbsoluto.toFixed(2)}º | Ângulo Final: ${angDestino.toFixed(2)}º`);
    console.log(` -> Intervalos Angular / Segmentos Detectados: ${calc.logsSegmentos.join(" + ")}`);
    console.log(` -> Taxa Média Aplicada: ${taxaMedia.toFixed(2)} ms/grau`);
    console.log(` -> Tempo Bruto Calculado: ${tempoBruto.toFixed(0)} ms`);
    console.log(` -> Velocidade Usada: ${VELOCIDADE_MOTOR}%`);
    console.log(` -> Tempo de Envio (c/ Inércia/Folga): ${tempoMs}ms`);
    console.log(`==================================\n`);
    
    if (arduino.isOpen) arduino.write(`<ALIGN,${angDestino},${VELOCIDADE_MOTOR},${dirAlinhamento},${tempoMs}>\n`);
}


// LÓGICA FÍSICA FINA DA TAREFA PRINCIPAL
function executarTarefaPrincipal(tarefa) {
    let distancia = 0;
    
    if (tarefa.direcao === DIR_AUMENTA) { 
        distancia = (tarefa.angFinal - pidConfig.anguloAbsoluto + 360) % 360;
    } else { 
        distancia = (pidConfig.anguloAbsoluto - tarefa.angFinal + 360) % 360;
    }

    if (distancia < 0.2) {
         console.log(`\x1b[33m[CLP] Distância infinitesimal (${distancia.toFixed(2)}º). Já no alvo. Finalizando.\x1b[0m`);
         parser.emit('data', 'STANDBY\r\n'); 
         return;
    }

    // Substituição pela Nova Lógica de Dicionário
    const calc = calcularTempoFisico(pidConfig.anguloAbsoluto, distancia, tarefa.direcao);
    let tempoBruto = calc.tempoTotalBruto;
    let taxaMedia = calc.taxaMedia;
    
    let tempoCorrigido = tempoBruto - pidConfig.inerciaMs; 
    if (tempoCorrigido < 0) tempoCorrigido = 0;

    let tempoComFolga = tempoCorrigido;
    let aplicouFolga = false;
    if (pidConfig.ultimaDirecao !== null && pidConfig.ultimaDirecao !== tarefa.direcao) {
        tempoComFolga += pidConfig.folgaReversaoMs;
        aplicouFolga = true;
    }

    const tempoMs = Math.round(tempoComFolga);

    let tempoDeMovimentoReal = tempoMs;
    if (aplicouFolga) tempoDeMovimentoReal -= pidConfig.folgaReversaoMs;
    tempoDeMovimentoReal += pidConfig.inerciaMs; 

    tarefa.distanciaReal = tempoDeMovimentoReal / taxaMedia;

    console.log(`\n\x1b[34m=== [EXECUÇÃO PRINCIPAL DETALHADA] ===\x1b[0m`);
    console.log(` -> Direção Utilizada: ${tarefa.direcao === DIR_AUMENTA ? 'HORÁRIO (Aumenta)' : 'ANTI-HORÁRIO (Diminui)'}`);
    console.log(` -> Ângulo Inicial: ${pidConfig.anguloAbsoluto.toFixed(2)}º | Ângulo Final: ${tarefa.angFinal.toFixed(2)}º`);
    console.log(` -> Água Ativada (Irrigação): ${tarefa.bomba ? "ON" : "OFF"}`);
    console.log(` -> Velocidade Usada: ${VELOCIDADE_MOTOR}%`);
    console.log(` -> Intervalos Angular / Segmentos Detectados: ${calc.logsSegmentos.join(" + ")}`);
    console.log(` -> Taxa Média Aplicada: ${taxaMedia.toFixed(2)} ms/grau | Tempo Bruto: ${tempoBruto.toFixed(0)} ms`);
    console.log(` -> Matemática Compensada: Inércia: -${pidConfig.inerciaMs}ms ${aplicouFolga ? '| Folga: +'+pidConfig.folgaReversaoMs+'ms' : ''} | Pulso Físico: ${tempoMs}ms`);
    console.log(`======================================\n`);
    
    if (arduino.isOpen) arduino.write(`<AUTO,${tarefa.angFinal},${VELOCIDADE_MOTOR},${tarefa.direcao},${tempoMs},${tarefa.bomba ? 1 : 0}>\n`);
}


// RECEPÇÃO DO ARDUINO E MÁQUINA DE ESTADOS
parser.on('data', async (data) => {
    const msg = data.trim();
    if (msg.startsWith("[ARDUINO] Sistema Ativo")) return;

    console.log(`\x1b[36m[ARDUINO] ${msg}\x1b[0m`);

    if ((msg === 'STANDBY' || msg.startsWith('[PID_FEEDBACK]')) && sistemaOcupado) {
        if (aguardandoAlinhamento) {
            aguardandoAlinhamento = false;
            
            if (alinhamentoPendente) {
                if (alinhamentoPendente.direcao === DIR_AUMENTA) {
                    pidConfig.anguloAbsoluto = (pidConfig.anguloAbsoluto + alinhamentoPendente.distanciaReal) % 360;
                } else {
                    pidConfig.anguloAbsoluto = (pidConfig.anguloAbsoluto - alinhamentoPendente.distanciaReal + 360) % 360;
                }
                pidConfig.ultimaDirecao = alinhamentoPendente.direcao;
                alinhamentoPendente = null;
            }
            
            console.log(`\x1b[32m[SISTEMA] Alinhamento concluído. Posição Física Real Calculada: ${pidConfig.anguloAbsoluto.toFixed(2)}º.\x1b[0m`);
            setTimeout(() => { executarTarefaPrincipal(tarefaPendente); }, 3000);
            
        } else {
            if (tarefaPendente) {
                if (tarefaPendente.direcao === DIR_AUMENTA) {
                    pidConfig.anguloAbsoluto = (pidConfig.anguloAbsoluto + tarefaPendente.distanciaReal) % 360;
                } else {
                    pidConfig.anguloAbsoluto = (pidConfig.anguloAbsoluto - tarefaPendente.distanciaReal + 360) % 360;
                }
                pidConfig.ultimaDirecao = tarefaPendente.direcao;
                tarefaPendente = null;
            }
            
            console.log(`\x1b[32m[SISTEMA] Comando Automático concluído. Posição Física Real Atualizada: ${pidConfig.anguloAbsoluto.toFixed(2)}º.\x1b[0m`);
            
            if (timeoutSeguranca) clearTimeout(timeoutSeguranca);

            if (usarCLP && client.isOpen) {
                try {
                    await client.writeCoil(0, false); 
                    await client.writeCoil(10, true); 
                    setTimeout(async () => {
                        if (client.isOpen) {
                            try { await client.writeCoil(10, false); } 
                            catch (err) { tratarErroModbus(err); }
                        }
                    }, 2000);
                } catch (e) { tratarErroModbus(e); }
            }
            sistemaOcupado = false; 
        }
    }
    
    if (msg === '[SYS] FREE_STOP' || msg === 'LIVRE') {
        if (timeoutSeguranca) clearTimeout(timeoutSeguranca); 
        sistemaOcupado = false;
    }
});


// CLI INTERATIVO (MANUAL TERMINAL) - COM NOVAS FERRAMENTAS DE CALIBRAÇÃO POR SEGMENTO
rl.on('line', (input) => {
    const args = input.trim().split(' ');
    const cmd = args[0].toUpperCase();

    if (cmd === 'SET_POS' && args.length === 2) {
        pidConfig.anguloAbsoluto = parseFloat(args[1]);
        pidConfig.ultimaDirecao = null; 
        if (arduino.isOpen) arduino.write(`<SET_POS,${Math.round(pidConfig.anguloAbsoluto)}>\n`); 
        console.log(`\x1b[32m[MEMÓRIA] Servomotor calibrado para ${pidConfig.anguloAbsoluto.toFixed(2)}º\x1b[0m`);
        return;
    }

    if (cmd === 'GOTO' && args.length === 2) {
        if (sistemaOcupado) {
            console.log("\x1b[31m[ERRO] O sistema já está ocupado executando outra tarefa.\x1b[0m");
            return;
        }
        const alvo = parseFloat(args[1]);
        console.log(`\x1b[35m[TESTE MANUAL] Simulando ordem para ${alvo}º...\x1b[0m`);
        sistemaOcupado = true;
        alinharMotor(alvo);
        return;
    }

    // TUNE GLOBAL LEGADO (Substitui TUDO para caso você queira resetar rápido a maquete)
    if (cmd === 'TUNE' && args.length === 6) {
        VELOCIDADE_MOTOR = parseInt(args[1]);
        TAXA_DIR_AUMENTA = parseFloat(args[2]);
        TAXA_DIR_DIMINUI = parseFloat(args[3]);
        pidConfig.inerciaMs = parseInt(args[4]);
        pidConfig.folgaReversaoMs = parseInt(args[5]);
        
        ["0_90", "90_180", "180_270", "270_360"].forEach(seg => {
            CALIBRACAO_ROTACAO[DIR_AUMENTA][seg] = TAXA_DIR_AUMENTA;
            CALIBRACAO_ROTACAO[DIR_DIMINUI][seg] = TAXA_DIR_DIMINUI;
        });

        console.log(`\x1b[32m[CALIBRAÇÃO GLOBAL] Resetou e aplicou as taxas globais em TODOS os segmentos!\x1b[0m`);
        return;
    }

    // NOVO COMANDO: TUNE_SEG <direção 0/1> <segmento> <taxa>
    if (cmd === 'TUNE_SEG' && args.length === 4) {
        const dir = parseInt(args[1]);
        const seg = args[2];
        const taxa = parseFloat(args[3]);

        if (CALIBRACAO_ROTACAO[dir] && CALIBRACAO_ROTACAO[dir][seg] !== undefined) {
            CALIBRACAO_ROTACAO[dir][seg] = taxa;
            const nomeDir = dir === 0 ? "HORÁRIO" : "ANTI-HORÁRIO";
            console.log(`\x1b[32m[CALIBRAÇÃO FINA] Quadrante Físico [${seg}] no sentido ${nomeDir} ajustado para ${taxa} ms/grau!\x1b[0m`);
        } else {
            console.log(`\x1b[31m[ERRO] Direção ou Segmento inválido. Use 0 ou 1 | 0_90, 90_180, 180_270, 270_360\x1b[0m`);
            console.log(`Exemplo: TUNE_SEG 1 90_180 8.5`);
        }
        return;
    }

    if (cmd === 'FREE' && args.length === 4) {
        sistemaOcupado = true;
        if (arduino.isOpen) arduino.write(`<FREE,${parseInt(args[1])},${parseInt(args[2])},${parseInt(args[3])}>\n`);
        return;
    }

    if (cmd === 'STOP') { 
        if (arduino.isOpen) arduino.write(`<FREE>\n`); 
        sistemaOcupado = false; 
        return; 
    }
    
    console.log("---------------------------------------------------------");
    console.log("Comandos Disponíveis:");
    console.log(" SET_POS <angulo>    : Define a posição atual fisicamente.");
    console.log(" GOTO <angulo>       : Manda o servo ir até o ângulo desejado (Teste de precisão).");
    console.log(" TUNE <v> <ta> <td> <i> <f>: Ajusta Vel, Taxa_Aum, Taxa_Dim, Inércia e Folga (Global).");
    console.log(" TUNE_SEG <dir> <seg> <tx>: Define a taxa (ms/grau) exata de um quadrante.");
    console.log("                      Ex: TUNE_SEG 0 0_90 12.5");
    console.log(" FREE <v> <ms> <dir> : Roda o motor de forma pura.");
    console.log(" STOP                : Parada de emergência.");
    console.log("---------------------------------------------------------");
});

function tratarErroModbus(error) {
    if (error.message.includes("exception 7") || error.message.includes("Negative acknowledge")) {
        console.log(`\x1b[33m[DIAGNÓSTICO] O CLP está em STOP.\x1b[0m`);
    }
}

// LOOP MODBUS TCP
async function iniciarModbus() {
    if (!usarCLP) return;

    try {
        await client.connectTCP("127.0.0.1", { port: 10003 });
        client.setID(1); 

        setInterval(async () => {
            if (sistemaOcupado) return; 

            if (!client.isOpen) {
                try {
                    await client.connectTCP("127.0.0.1", { port: 10003 });
                    client.setID(1);
                } catch (e) { return; }
            }

            try {
                const coils = await client.readCoils(0, 3);
                
                if (coils.data[0]) { 
                    const bombaAtiva = coils.data[1]; 
                    const direcaoCorrigida = coils.data[2] ? 1 : 0; 
                    const regs = await client.readHoldingRegisters(100, 6); 
                    
                    const angInicial = (regs.data[1] << 16) | regs.data[0];
                    const angFinal = (regs.data[3] << 16) | regs.data[2];

                    console.log(`\x1b[33m[CLP] NOVO COMANDO! Início: ${angInicial}º | Fim: ${angFinal}º | Dir: ${direcaoCorrigida}\x1b[0m`);

                    tarefaPendente = { angInicial, angFinal, direcao: direcaoCorrigida, bomba: bombaAtiva };
                    sistemaOcupado = true; 

                    if (timeoutSeguranca) clearTimeout(timeoutSeguranca);
                    timeoutSeguranca = setTimeout(() => {
                        if (sistemaOcupado) {
                            sistemaOcupado = false;
                            tarefaPendente = null;
                            aguardandoAlinhamento = false;
                        }
                    }, 180000);

                    let desvioAlinhamento = Math.abs(pidConfig.anguloAbsoluto - angInicial);
                    if (desvioAlinhamento > 180) desvioAlinhamento = 360 - desvioAlinhamento;

                    if (desvioAlinhamento > 1.0) {
                        alinharMotor(angInicial);
                    } else {
                        console.log(`\x1b[32m[SISTEMA] Motor já no ponto físico aceitável (${pidConfig.anguloAbsoluto.toFixed(2)}º). Pulando alinhamento explícito.\x1b[0m`);
                        executarTarefaPrincipal(tarefaPendente);
                    }
                }
            } catch (e) {
                tratarErroModbus(e);
            }
        }, 500);
    } catch (e) {
        setTimeout(iniciarModbus, 5000);
    }
}

iniciarModbus();