import readline from 'readline';
import { supabase } from './config/supabase.js';

// ============================================================================
// TIPAGENS DO NOVO SCHEMA
// ============================================================================
interface CronogramaParams {
    pivo_id: string;
    criado_por: string;
    nome: string;
    horario_inicio: string;
}

interface PassoManualParams {
    cronograma_id: string;
    pivo_id: string;
    nome: string;
    angulo_inicial: number;
    angulo_final: number;
    lamina: number;
    irrigacao: boolean;
    direcao: 'HORARIO' | 'ANTI_HORARIO'; // Corrigido para bater com o CHECK do banco
    ordem: number;
}

interface CronogramaCompletoParams extends CronogramaParams {
    etapas: (Omit<PassoManualParams, 'cronograma_id' | 'pivo_id' | 'ordem'> | { preset_id: string })[];
}

// ============================================================================
// 1. CRIAR CRONOGRAMA
// ============================================================================
export async function criarCronograma(params: CronogramaParams): Promise<string> {
    // CORREÇÃO DA CONSTRAINT: Passo a Passo (Busca e Desativa)
    // 1. Busca os cronogramas que estão bloqueando o pivô
    const { data: ativos, error: errBusca } = await supabase
        .from('cronogramas')
        .select('id')
        .eq('pivo_id', params.pivo_id)
        .eq('is_ativo', true);

    if (errBusca) throw new Error(`Erro ao verificar cronogramas ativos: ${errBusca.message}`);

    // 2. Se encontrou, desativa um por um explicitamente
    if (ativos && ativos.length > 0) {
        console.log(`\n[AVISO] Encontrado(s) ${ativos.length} cronograma(s) ativo(s) para este pivô. Interrompendo para liberar espaço...`);
        for (const cronograma of ativos) {
            const { error: errUpdate } = await supabase
                .from('cronogramas')
                .update({ 
                    is_ativo: false,
                    status_final: 'interrompido' // <-- Corrigido para o valor exato do ENUM
                })
                .eq('id', cronograma.id);
            
            if (errUpdate) {
                throw new Error(`Falha ao desativar cronograma anterior (${cronograma.id}). Erro do banco: ${errUpdate.message}`);
            }
        }
    }

    // 3. Agora insere com segurança
    const { data, error } = await supabase
        .from('cronogramas')
        .insert([{
            pivo_id: params.pivo_id,
            criado_por: params.criado_por,
            nome: params.nome,
            horario_inicio: params.horario_inicio,
            status_final: 'aguardando',
            is_ativo: true
        }])
        .select('id')
        .single();

    if (error) throw new Error(`Erro ao criar cronograma: ${error.message}`);
    return data.id;
}

// ============================================================================
// 2. ADICIONAR PASSO MANUAL
// ============================================================================
export async function adicionarPassoManual(params: PassoManualParams): Promise<string> {
    const { data, error } = await supabase
        .from('cronograma_passos')
        .insert([{
            ...params,
            status_passo: 'aguardando'
        }])
        .select('id')
        .single();

    if (error) throw new Error(`Erro ao adicionar passo manual: ${error.message}`);
    return data.id;
}

// ============================================================================
// 3. ADICIONAR PRESET AO CRONOGRAMA
// ============================================================================
export async function adicionarPresetAoCronograma(cronogramaId: string, presetId: string, ordem: number, pivoId: string): Promise<string> {
    const { data: preset, error: errPreset } = await supabase
        .from('presets')
        .select('*')
        .eq('id', presetId)
        .single();

    if (errPreset || !preset) throw new Error(`Preset não encontrado ou erro de acesso: ${errPreset?.message}`);

    const { data, error } = await supabase
        .from('cronograma_passos')
        .insert([{
            cronograma_id: cronogramaId,
            pivo_id: pivoId,
            preset_origem_id: preset.id,
            nome: preset.nome,
            angulo_inicial: preset.angulo_inicial,
            angulo_final: preset.angulo_final,
            lamina: preset.lamina,
            irrigacao: preset.irrigacao,
            direcao: preset.direcao,
            ordem: ordem,
            status_passo: 'aguardando'
        }])
        .select('id')
        .single();

    if (error) throw new Error(`Erro ao adicionar passo via preset: ${error.message}`);
    return data.id;
}

// ============================================================================
// 5. CRIAR CRONOGRAMA COMPLETO (Helper)
// ============================================================================
export async function criarCronogramaCompleto(params: CronogramaCompletoParams) {
    console.log(`\n[AGENDADOR] Gerando cronograma completo: ${params.nome}`);
    const cronogramaId = await criarCronograma(params);

    let ordemAtual = 1;

    for (const etapa of params.etapas) {
        if ('preset_id' in etapa) {
            await adicionarPresetAoCronograma(cronogramaId, etapa.preset_id, ordemAtual, params.pivo_id);
        } else {
            await adicionarPassoManual({
                cronograma_id: cronogramaId,
                pivo_id: params.pivo_id,
                ordem: ordemAtual,
                ...etapa
            });
        }
        ordemAtual++;
    }

    console.log(`[AGENDADOR] Cronograma ${cronogramaId} salvo no banco com ${params.etapas.length} passo(s).\n`);
    return cronogramaId;
}

// ============================================================================
// 6. LISTAR CRONOGRAMAS
// ============================================================================
export async function listarCronogramas() {
    const { data, error } = await supabase
        .from('cronogramas')
        .select('id, nome, status_final, horario_inicio, is_ativo, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar cronogramas: ${error.message}`);
    
    // Formata a exibição para não mostrar a conversão UTC no terminal, alinhando com o que o worker lê.
    const cronogramasFormatados = data.map((c: any) => ({
        ...c,
        horario_inicio: c.horario_inicio.replace(/(Z|[+-]\d{2}:\d{2})$/, '').replace('T', ' ')
    }));
    
    return cronogramasFormatados;
}

// ============================================================================
// 7. LISTAR PASSOS DE UM CRONOGRAMA
// ============================================================================
export async function listarPassos(cronogramaId: string) {
    const { data, error } = await supabase
        .from('cronograma_passos')
        .select('id, ordem, nome, status_passo, angulo_inicial, angulo_final, lamina, irrigacao, direcao, preset_origem_id')
        .eq('cronograma_id', cronogramaId)
        .order('ordem', { ascending: true });

    if (error) throw new Error(`Erro ao listar passos: ${error.message}`);
    return data;
}

// ============================================================================
// 8. REORDENAR ETAPAS
// ============================================================================
export async function reordenarEtapas(atualizacoes: { id: string, nova_ordem: number }[]) {
    for (const item of atualizacoes) {
        const { error } = await supabase
            .from('cronograma_passos')
            .update({ ordem: item.nova_ordem })
            .eq('id', item.id);
        
        if (error) throw new Error(`Erro ao reordenar passo ${item.id}: ${error.message}`);
    }
    console.log("[AGENDADOR] Passos reordenados com sucesso.");
}

// ============================================================================
// 9. REMOVER ETAPA (E Reorganizar)
// ============================================================================
export async function removerPasso(passoId: string, cronogramaId: string) {
    const { error: deleteErr } = await supabase.from('cronograma_passos').delete().eq('id', passoId);
    if (deleteErr) throw new Error(`Erro ao deletar passo: ${deleteErr.message}`);

    const passosRestantes = await listarPassos(cronogramaId);
    
    let novaOrdem = 1;
    for (const passo of passosRestantes) {
        if (passo.ordem !== novaOrdem) {
            await supabase.from('cronograma_passos').update({ ordem: novaOrdem }).eq('id', passo.id);
        }
        novaOrdem++;
    }
    console.log(`[AGENDADOR] Passo removido e ordem do cronograma reorganizada.`);
}

// ============================================================================
// 10. CANCELAR CRONOGRAMA
// ============================================================================
export async function cancelarCronograma(cronogramaId: string) {
    const { error } = await supabase
        .from('cronogramas')
        .update({ 
            is_ativo: false,
            status_final: 'interrompido' // <-- Corrigido para o valor exato do ENUM
        })
        .eq('id', cronogramaId);

    if (error) throw new Error(`Erro ao cancelar cronograma: ${error.message}`);
    console.log(`[AGENDADOR] Cronograma ${cronogramaId} cancelado (status: interrompido).`);
}

// ============================================================================
// 11. DUPLICAR CRONOGRAMA
// ============================================================================
export async function duplicarCronograma(cronogramaId: string, novoCriadoPor: string) {
    const { data: original, error: errOrig } = await supabase
        .from('cronogramas')
        .select('*')
        .eq('id', cronogramaId)
        .single();
    
    if (errOrig || !original) throw new Error(`Cronograma original não encontrado`);

    const passos = await listarPassos(cronogramaId);

    const novoCronogramaId = await criarCronograma({
        pivo_id: original.pivo_id,
        criado_por: novoCriadoPor,
        nome: `${original.nome} (Cópia)`,
        horario_inicio: original.horario_inicio
    });

    for (const passo of passos) {
        await adicionarPassoManual({
            cronograma_id: novoCronogramaId,
            pivo_id: original.pivo_id,
            nome: passo.nome,
            angulo_inicial: passo.angulo_inicial,
            angulo_final: passo.angulo_final,
            lamina: passo.lamina,
            irrigacao: passo.irrigacao,
            direcao: passo.direcao as any,
            ordem: passo.ordem
        });
    }

    console.log(`[AGENDADOR] Cronograma duplicado com sucesso. Novo ID: ${novoCronogramaId}`);
    return novoCronogramaId;
}

// ============================================================================
// FUNÇÃO AUXILIAR DE FORMATAÇÃO DE DIREÇÃO (Para o CHECK Constraint do Banco)
// ============================================================================
function formatarDirecao(direcao: string): 'HORARIO' | 'ANTI_HORARIO' {
    const formatada = direcao.toUpperCase().trim();
    if (formatada === 'REVERSO' || formatada === 'ANTI-HORARIO' || formatada === 'ANTI_HORARIO') {
        return 'ANTI_HORARIO';
    }
    return 'HORARIO';
}

// ============================================================================
// INTERFACE DE TERMINAL (CLI INTERATIVA COMPLETA)
// ============================================================================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (pergunta: string): Promise<string> => new Promise(resolve => rl.question(pergunta, resolve));

async function iniciarCLI() {
    console.log("\n=======================================================");
    console.log("   PLUVIA: GERENCIADOR DE CRONOGRAMAS E PREFERÊNCIAS   ");
    console.log("=======================================================\n");

    try {
        const { data: pivos } = await supabase.from('pivos').select('id, nome_pivo').limit(1);
        const { data: usuarios } = await supabase.from('usuarios').select('id, nome').limit(1);

        if (!pivos?.[0] || !usuarios?.[0]) throw new Error("Banco de dados vazio (sem pivô/usuário para testes).");

        const pivoId = pivos[0].id;
        const usuarioId = usuarios[0].id;

        while (true) {
            // BLOCO TRY CATCH INTERNO: Evita que erros de UUID quebrem a aplicação inteira
            try {
                console.log(`\n--- Conectado como: ${usuarios[0].nome} | Pivô: ${pivos[0].nome_pivo} ---`);
                console.log("1. Criar Novo Cronograma (Digitar Preferências Manuais/Presets)");
                console.log("2. Adicionar Passo a um Cronograma Existente");
                console.log("3. Listar Cronogramas Ativos");
                console.log("4. Listar Passos de um Cronograma Específico");
                console.log("5. Remover um Passo de um Cronograma");
                console.log("6. Duplicar Cronograma");
                console.log("7. Cancelar Cronograma");
                console.log("8. Sair");
                
                const opcao = await perguntar("\nEscolha uma opção: ");

                switch (opcao) {
                    case '1': {
                        const nome = await perguntar("Nome do cronograma (ex: Rega Noturna): ");
                        const horario = await perguntar("Horário de início (HH:mm): ");
                        
                        // --- CORREÇÃO DE ALINHAMENTO COM O WORKER ---
                        // Pega a data local garantindo que o "dia" será o mesmo do relógio local
                        const agora = new Date();
                        const ano = agora.getFullYear();
                        const mes = String(agora.getMonth() + 1).padStart(2, '0');
                        const dia = String(agora.getDate()).padStart(2, '0');
                        const dataHojeLocal = `${ano}-${mes}-${dia}`;
                        
                        // Para funcionar perfeitamente com a "solução cirúrgica" do worker, cravamos os 
                        // números exatos que o utilizador digitou no banco de dados usando a tag +00:00.
                        const horarioInicioFormatado = `${dataHojeLocal}T${horario}:00+00:00`;
                        
                        const etapas = [];
                        let adicionarMais = true;
                        
                        while(adicionarMais) {
                            console.log(`\n--- Configurando o Passo ${etapas.length + 1} ---`);
                            const usarPreset = await perguntar("Deseja importar um Preset? (s/n): ");

                            if (usarPreset.toLowerCase() === 's') {
                                const { data: presets } = await supabase.from('presets').select('id, nome, lamina');
                                
                                if (!presets || presets.length === 0) {
                                    console.log("⚠️ Nenhum preset encontrado no banco. Tente adicionar manualmente.");
                                } else {
                                    console.log("\n--- Presets Disponíveis ---");
                                    // Mostra os presets com um índice em vez de exigir a digitação do UUID
                                    presets.forEach((p, idx) => {
                                        console.log(`[${idx}] - ${p.nome} (Lâmina: ${p.lamina}mm)`);
                                    });
                                    
                                    const indexStr = await perguntar("\nDigite o NÚMERO (índice) do Preset escolhido: ");
                                    const index = parseInt(indexStr);

                                    if (isNaN(index) || !presets[index]) {
                                        console.log("❌ Índice inválido! Passo ignorado.");
                                    } else {
                                        etapas.push({ preset_id: presets[index].id });
                                        console.log(`✅ Preset '${presets[index].nome}' adicionado à fila!`);
                                    }
                                }
                            } else {
                                console.log("-> Insira as preferências manuais para este passo:");
                                const angInicial = parseInt(await perguntar("  Ângulo Inicial (0-360): "));
                                const angFinal = parseInt(await perguntar("  Ângulo Final (0-360): "));
                                const direcaoStr = await perguntar("  Direção (HORARIO/REVERSO): ");
                                const irrigacaoStr = await perguntar("  Ligar Bomba de Água? (s/n): ");
                                const laminaStr = await perguntar("  Lâmina de Água (mm): ");
                                
                                etapas.push({
                                    nome: `Passo CLI ${etapas.length + 1}`,
                                    angulo_inicial: angInicial,
                                    angulo_final: angFinal,
                                    lamina: parseFloat(laminaStr),
                                    irrigacao: irrigacaoStr.toLowerCase() === 's',
                                    direcao: formatarDirecao(direcaoStr)
                                });
                            }

                            const resp = await perguntar("\nAdicionar mais um passo a este cronograma? (s/n): ");
                            adicionarMais = resp.toLowerCase() === 's';
                        }

                        if (etapas.length > 0) {
                            await criarCronogramaCompleto({
                                nome,
                                horario_inicio: horarioInicioFormatado,
                                pivo_id: pivoId,
                                criado_por: usuarioId,
                                etapas
                            });
                        } else {
                            console.log("Nenhum passo foi adicionado. Cronograma descartado.");
                        }
                        break;
                    }
                    case '2': {
                        const cronogramaId = await perguntar("Digite o ID completo (UUID) do Cronograma: ");
                        const passosAtuais = await listarPassos(cronogramaId);
                        const proximaOrdem = passosAtuais.length + 1;

                        console.log(`\nAdicionando na ordem: ${proximaOrdem}`);
                        const angInicial = parseInt(await perguntar("Ângulo Inicial: "));
                        const angFinal = parseInt(await perguntar("Ângulo Final: "));
                        const direcaoStr = await perguntar("Direção (HORARIO/REVERSO): ");
                        const irrigacaoStr = await perguntar("Ligar Bomba? (s/n): ");
                        const laminaStr = await perguntar("Lâmina (mm): ");

                        await adicionarPassoManual({
                            cronograma_id: cronogramaId,
                            pivo_id: pivoId,
                            nome: `Passo Adicional CLI`,
                            angulo_inicial: angInicial,
                            angulo_final: angFinal,
                            lamina: parseFloat(laminaStr),
                            irrigacao: irrigacaoStr.toLowerCase() === 's',
                            direcao: formatarDirecao(direcaoStr),
                            ordem: proximaOrdem
                        });
                        console.log(`\n✅ Passo adicionado com sucesso na ordem ${proximaOrdem}.`);
                        break;
                    }
                    case '3': {
                        const lista = await listarCronogramas();
                        console.table(lista.slice(0, 10)); // Exibe apenas os 10 mais recentes para não poluir
                        break;
                    }
                    case '4': {
                        const id = await perguntar("Digite o ID completo (UUID) do Cronograma: ");
                        const passos = await listarPassos(id);
                        console.table(passos);
                        break;
                    }
                    case '5': {
                        const cronogramaId = await perguntar("Digite o ID completo (UUID) do Cronograma: ");
                        const passos = await listarPassos(cronogramaId);
                        
                        if (!passos || passos.length === 0) {
                            console.log("Nenhum passo encontrado neste cronograma.");
                            break;
                        }
                        
                        console.log("\n--- Passos Deste Cronograma ---");
                        passos.forEach((p, idx) => console.log(`[${idx}] - Ordem: ${p.ordem} | Nome: ${p.nome}`));
                        
                        // Utilizando índice numérico para remover, facilitando a vida
                        const passoIdxStr = await perguntar("\nDigite o NÚMERO (índice) do Passo que deseja apagar: ");
                        const passoIdx = parseInt(passoIdxStr);
                        
                        if (isNaN(passoIdx) || !passos[passoIdx]) {
                            console.log("❌ Índice inválido!");
                        } else {
                            await removerPasso(passos[passoIdx].id, cronogramaId);
                        }
                        break;
                    }
                    case '6': {
                        const id = await perguntar("Digite o ID completo (UUID) do Cronograma a duplicar: ");
                        await duplicarCronograma(id, usuarioId);
                        break;
                    }
                    case '7': {
                        const id = await perguntar("Digite o ID completo (UUID) do Cronograma para cancelar: ");
                        await cancelarCronograma(id);
                        break;
                    }
                    case '8': {
                        console.log("Encerrando CLI...");
                        rl.close();
                        return; // Sai do laço while(true)
                    }
                    default:
                        console.log("Opção inválida, tente novamente.");
                }
            } catch (loopErr: any) {
                // Caso ocorra qualquer erro (como digitar "teste" em vez de um UUID real)
                // O aplicativo intercepta o erro, avisa na tela e Volta para o menu!
                console.error(`\n❌ ERRO NA OPERAÇÃO: ${loopErr.message}`);
                console.log("Retornando ao menu principal...\n");
            }
        }
    } catch (e: any) {
        console.error("❌ ERRO FATAL DE INICIALIZAÇÃO:", e.message);
        rl.close();
    }
}

// Executa automaticamente a interface de terminal
if (process.argv[1] && process.argv[1].endsWith('cli-agendador.ts')) {
    iniciarCLI();
}