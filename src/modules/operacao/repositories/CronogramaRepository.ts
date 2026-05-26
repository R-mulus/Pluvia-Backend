import { supabase } from "../../../config/supabase.js";
import type { CriarCronogramaDTO } from "../schemas/cronograma.schema.js";

export class CronogramaRepository {
  
  async listarPorPivo(pivo_id: string) {
    // Busca a pasta (cronograma) e os papeis dentro dela (cronograma_passos)
    const { data, error } = await supabase
      .from('cronogramas')
      .select(`
        *,
        usuarios!cronogramas_criado_por_fkey (nome),
        passos:cronograma_passos(*)
      `)
      .eq('pivo_id', pivo_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data.map(item => {
      const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
      return { ...item, nome_criador: usuario?.nome || 'Desconhecido' };
    });
  }

  async criarComPassos(dados: CriarCronogramaDTO) {
    // 1. Cria o Agrupador (cronogramas) agora com horario_inicio
    const { data: cronograma, error: errorCrono } = await supabase
      .from('cronogramas')
      .insert([{ 
        pivo_id: dados.pivo_id, 
        criado_por: dados.criado_por, 
        nome: dados.nome,
        horario_inicio: dados.horario_inicio // <- ADICIONADO
      }])
      .select()
      .single();

    if (errorCrono) throw new Error(errorCrono.message);

    // 2. Prepara os passos para inserir em lote, agora incluindo a ordem de execução
    const passosFormatados = dados.passos.map(passo => ({
      cronograma_id: cronograma.id,
      pivo_id: dados.pivo_id,
      preset_origem_id: passo.preset_origem_id,
      nome: passo.nome,
      angulo_inicial: passo.angulo_inicial,
      angulo_final: passo.angulo_final,
      lamina: passo.lamina,
      irrigacao: passo.irrigacao,
      direcao: passo.direcao,
      ordem: passo.ordem // <- ADICIONADO
    }));

    // 3. Insere os passos (cronograma_passos)
    const { data: passos, error: errorPassos } = await supabase
      .from('cronograma_passos')
      .insert(passosFormatados)
      .select();

    if (errorPassos) {
      await supabase.from('cronogramas').delete().eq('id', cronograma.id);
      throw new Error(errorPassos.message);
    }

    return { ...cronograma, passos };
  }

  async deletar(id: string) {
    // Como usamos ON DELETE CASCADE no SQL, deletar a pasta apaga os passos junto
    const { error } = await supabase.from("cronogramas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }

  async ativar(id: string, pivo_id: string) {
    // Passo 1: Desativa todos os cronogramas deste pivô
    await supabase
      .from('cronogramas')
      .update({ is_ativo: false })
      .eq('pivo_id', pivo_id);

    // Passo 2: Ativa apenas o cronograma selecionado
    const { data, error } = await supabase
      .from('cronogramas')
      .update({ is_ativo: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async controlar(id: string, novoStatus: string) {
    const { data, error } = await supabase
      .from('cronogramas')
      .update({ status_final: novoStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async atualizarStatusPrimeiroPasso(cronogramaId: string, status: string) {
    // Pega o ID do passo de ordem 1
    const { data: passo } = await supabase
      .from('cronograma_passos')
      .select('id')
      .eq('cronograma_id', cronogramaId)
      .eq('ordem', 1)
      .single();

    if (passo) {
      await supabase
        .from('cronograma_passos')
        .update({ status_passo: status })
        .eq('id', passo.id);
    }
  }
}