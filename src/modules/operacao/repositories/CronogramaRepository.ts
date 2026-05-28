import { supabase } from "../../../config/supabase.js";
import type { CriarCronogramaDTO } from "../schemas/cronograma.schema.js";

export class CronogramaRepository {
  
  async buscarPorId(id: string) {
    const { data, error } = await supabase
      .from('cronogramas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async listarPorPivo(pivo_id: string) {
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
    const { data: cronograma, error: errorCrono } = await supabase
      .from('cronogramas')
      .insert([{ 
        pivo_id: dados.pivo_id, 
        criado_por: dados.criado_por, 
        nome: dados.nome,
        horario_inicio: dados.horario_inicio
      }])
      .select()
      .single();

    if (errorCrono) throw new Error(errorCrono.message);

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
      ordem: passo.ordem
      // Nota: se o Arduino precisar de "horario" fixo na criação, o frontend teria que mandar. 
      // Mas a nossa gambiarra no Iniciar já vai cobrir isso!
    }));

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
    // 1. Apaga os logs de eventos associados a este cronograma para liberar a Foreign Key
    await supabase.from("event_logs").delete().eq("cronograma_id", id);
    
    // 2. Apaga os passos do cronograma para liberar a Foreign Key
    await supabase.from("cronograma_passos").delete().eq("cronograma_id", id);

    // 3. Finalmente apaga o cronograma
    const { error } = await supabase.from("cronogramas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }

  async ativar(id: string, pivo_id: string) {
    await supabase
      .from('cronogramas')
      .update({ is_ativo: false })
      .eq('pivo_id', pivo_id);

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

  // --- A GAMBIARRA OFICIAL DE INTEGRAÇÃO AQUI ---
  async atualizarStatusPrimeiroPasso(cronogramaId: string, status: string, forcarHorarioAgora: boolean = false) {
    const { data: passo } = await supabase
      .from('cronograma_passos')
      .select('id')
      .eq('cronograma_id', cronogramaId)
      .eq('ordem', 1)
      .single();

    if (passo) {
      const updatePayload: any = { status_passo: status };
      
      // Se for Iniciar ou Continuar, injetamos a hora ATUAL para enganar o relógio do Arduino
      if (forcarHorarioAgora) {
        updatePayload.horario = new Date().toISOString(); 
      }

      await supabase
        .from('cronograma_passos')
        .update(updatePayload)
        .eq('id', passo.id);
    }
  }
}