import readline from 'readline';
import { supabase } from './config/supabase.js';

const LAMINA_MINIMA_A_100_PORCENTO = 5.0; 

// Configuração da interface do terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const perguntar = (pergunta: string): Promise<string> => {
    return new Promise((resolve) => rl.question(pergunta, resolve));
};

async function iniciarCLI() {
    console.log("=========================================");
    console.log("  PLUVIA: SIMULADOR DE AGENDAMENTO CLI ");
    console.log("=========================================\n");

    try {
        const { data: pivos } = await supabase.from('pivos').select('id, nome_pivo').limit(1);
        const { data: usuarios } = await supabase.from('usuarios').select('id, nome').limit(1);

        const pivo = pivos?.[0];
        const usuario = usuarios?.[0];

        if (!pivo) throw new Error("Nenhum Pivô registado na base de dados.");
        if (!usuario) throw new Error("Nenhum Utilizador registado na base de dados.");

        const pivoId = pivo!.id;
        const usuarioId = usuario!.id;

        console.log(`[+] Conectado. Usando Pivô: ${pivo!.nome_pivo} | Utilizador: ${usuario!.nome}\n`);

        const horario = await perguntar("⏰ Qual o horário de execução? (HH:mm): ");
        
        const respIrrigacao = await perguntar("💧 Ligar a água (irrigação)? (s/n): ");
        const irrigacao = respIrrigacao.toLowerCase() === 's';

        let lamina = 0;
        let percentimetro = 100;

        // 3. O CÁLCULO DO PERCENTÍMETRO
        if (irrigacao) {
            const respLamina = await perguntar("📏 Qual a lâmina de água desejada? (em mm, ex: 10): ");
            lamina = parseFloat(respLamina);

            if (lamina > 0) {
                // Cálculo: Percentímetro = (Lamina_Minima / Lamina_Desejada) * 100
                percentimetro = Math.round((LAMINA_MINIMA_A_100_PORCENTO / lamina) * 100);
                
                // Travas de segurança (0 a 100%)
                if (percentimetro > 100) percentimetro = 100;
                if (percentimetro < 0) percentimetro = 0;
            }
        }

        const angulo_inicial = parseInt(await perguntar("📐 Ângulo inicial (0 a 360): "), 10);
        const angulo_final = parseInt(await perguntar("📐 Ângulo final (0 a 360): "), 10);
        
        const respDirecao = await perguntar("🔄 Direção (H para Horário, A para Anti-Horário): ");
        const direcao = respDirecao.toLowerCase() === 'h' ? 'HORARIO' : 'ANTI_HORARIO';

        console.log("\n=========================================");
        console.log("📋 RESUMO DO AGENDAMENTO:");
        console.log(`- Horário: ${horario}`);
        console.log(`- Irrigação: ${irrigacao ? 'LIGADA 💦' : 'DESLIGADA (A seco) 🏜️'}`);
        if (irrigacao) {
            console.log(`- Lâmina pedida: ${lamina} mm`);
        }
        console.log(`- Ângulo: De ${angulo_inicial}° até ${angulo_final}°`);
        console.log(`- Direção: ${direcao}`);
        console.log(`- ⚙️ VELOCIDADE CALCULADA (Percentímetro): ${percentimetro}%`);
        console.log("=========================================\n");

        const confirmar = await perguntar("🚀 Deseja enviar este comando para o Supabase? (s/n): ");

        if (confirmar.toLowerCase() === 's') {
            // 5. Guardar no Supabase
            
            const dataHoje = new Date().toISOString().split('T')[0]; 
            const horarioFormatado = `${dataHoje}T${horario}:00.000Z`;

            const comandoJSON = {
                lamina: irrigacao ? lamina : 0, 
                percentimetro, 
                angulo_inicial,
                angulo_final,
                irrigacao,
                direcao
            };

            const payload = {
                pivo_id: pivoId,
                criado_por: usuarioId,
                horario: horarioFormatado, 
                comando: comandoJSON,
                status_final: 'aguardando'
            };

            const { error } = await supabase.from('cronograma').insert([payload]);

            if (error) {
                console.error("❌ Erro ao guardar:", error.message);
            } else {
                console.log(`✅ Sucesso! Agendado para ${horario}. O worker.ts vai assumir o controlo em breve.`);
            }
        } else {
            console.log("🛑 Operação cancelada.");
        }

    } catch (error: any) {
        console.error("❌ Erro fatal:", error.message);
    } finally {
        rl.close();
        process.exit(0);
    }
}

iniciarCLI();