import { supabase } from '../../../config/supabase.js';

export class CronogramaRepository {
  async list() {
    return await supabase
      .from('cronograma')
      .select('*, pivos(nome_pivo, fazendas(nome_fazenda)), usuarios(nome)')
      .order('horario', { ascending: true });
  }

  async getById(id: string) {
    return await supabase
      .from('cronograma')
      .select('*')
      .eq('id', id)
      .maybeSingle();
  }

  async create(dados: any) {
    return await supabase
      .from('cronograma')
      .insert(dados)
      .select()
      .maybeSingle();
  }

  async update(id: string, dados: any) {
    return await supabase
      .from('cronograma')
      .update(dados)
      .eq('id', id)
      .select()
      .maybeSingle();
  }

  async delete(id: string) {
    return await supabase
      .from('cronograma')
      .delete()
      .eq('id', id);
  }
}