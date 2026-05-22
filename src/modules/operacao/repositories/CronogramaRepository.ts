import { supabase } from "../../../config/supabase.js";
import {
  type CriarComandoDTO,
  type UpdateComandoDTO,
} from "../schemas/comando.schema.js";

export class CronogramaRepository {
  async list() {
    return await supabase
      .from("cronograma")
      .select("*, pivos(nome_pivo, fazendas(nome_fazenda)), usuarios(nome)")
      .order("horario", { ascending: true });
  }

  async getById(id: string) {
    return await supabase
      .from("cronograma")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  }

  // Utilizamos a interseção (&) para fundir o DTO do usuário com os campos internos do sistema
  async create(dados: CriarComandoDTO & { status_final: string }) {
    return await supabase
      .from('cronograma')
      .insert(dados)
      .select()
      .maybeSingle();
  }

  async update(id: string, dados: UpdateComandoDTO) {
    return await supabase
      .from("cronograma")
      .update(dados)
      .eq("id", id)
      .select()
      .maybeSingle();
  }

  async delete(id: string) {
    return await supabase.from("cronograma").delete().eq("id", id);
  }

  async listarPorPivo(pivo_id: string) {
    // Aqui acontece a mágica do JOIN no Supabase
    // Buscamos tudo do cronograma, e da tabela 'usuarios' puxamos apenas o 'nome'
    const { data, error } = await supabase
      .from('cronograma')
      .select(`
        id,
        pivo_id,
        comando,
        horario,
        status_final,
        updated_at,
        nome_agendamento,
        criado_por,
        usuarios!cronograma_criado_por_fkey (
          nome
        )
      `)
      .eq('pivo_id', pivo_id)
      .order('horario', { ascending: true });

    if (error) throw new Error(error.message);

    return data.map(item => {
      // Garantimos que o TypeScript entenda a estrutura, seja array ou objeto
      const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
      
      return {
        ...item,
        nome_criador: usuario?.nome || 'Desconhecido'
      };
    });
  }

  async criarAgendamento(payload: any) {
    const { data, error } = await supabase
      .from('cronograma')
      .insert([{
        pivo_id: payload.pivo_id,
        horario: payload.horario,
        comando: payload.comando,
        criado_por: payload.criado_por,
        nome_agendamento: payload.nome_agendamento // Salvando a nova coluna
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  
  async deletarAgendamento(id: string) {
    const { error } = await supabase
      .from('cronograma')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(error.message);
    return true;
  }

  async agendarPreset(dados: { 
  pivo_id: string, 
  preset_origem_id: string, 
  comando: any, 
  horario: string, 
  ordem_execucao: number 
}) {
  return await supabase
    .from("cronograma")
    .insert([dados]) // Aqui salvamos o comando como snapshot
    .select()
    .single();
}
}
