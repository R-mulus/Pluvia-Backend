import { supabase } from '../../../config/supabase.js';

export class CadastroRepository {
  // --- USUÁRIOS ---
  async listUsuarios() {
    return await supabase.from('usuarios').select('*').order('nome', { ascending: true });
  }

  async getUsuarioById(id: string) {
    // maybeSingle retorna null se não encontrar, em vez de disparar erro
    return await supabase.from('usuarios').select('*').eq('id', id).maybeSingle();
  }

  async createUsuario(dados: any) {
    return await supabase.from('usuarios').insert(dados).select().maybeSingle();
  }

  async updateUsuario(id: string, dados: any) {
    return await supabase.from('usuarios').update(dados).eq('id', id).select().maybeSingle();
  }

  async getUsuarioRelacoes(id: string) {
    const { count: fazendas } = await supabase.from('fazendas').select('*', { count: 'exact', head: true }).eq('proprietario_id', id);
    const { count: operacoes } = await supabase.from('pivo_operadores').select('*', { count: 'exact', head: true }).eq('usuario_id', id);
    
    return {
      temFazendas: (fazendas || 0) > 0,
      temOperacoes: (operacoes || 0) > 0
    };
  }

  async deleteUsuario(id: string) {
    return await supabase.from('usuarios').delete().eq('id', id);
  }

  // --- FAZENDAS ---
  async listFazendas() {
    return await supabase.from('fazendas').select('*, usuarios(nome)').order('nome_fazenda');
  }

  async getFazendaById(id: string) {
    return await supabase.from('fazendas').select('*, usuarios(nome)').eq('id', id).maybeSingle();
  }

  async createFazenda(dados: any) {
    return await supabase.from('fazendas').insert(dados).select().maybeSingle();
  }

  async updateFazenda(id: string, dados: any) {
    return await supabase.from('fazendas').update(dados).eq('id', id).select().maybeSingle();
  }

  async getPivosDaFazenda(fazendaId: string) {
    const { count } = await supabase.from('pivos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId);
    return (count || 0) > 0;
  }

  async deleteFazenda(id: string) {
    return await supabase.from('fazendas').delete().eq('id', id);
  }

  // --- PIVÔS ---
  async listPivos() {
    return await supabase.from('pivos').select('*, fazendas(nome_fazenda)').order('nome_pivo');
  }

  async getPivoById(id: string) {
    return await supabase.from('pivos').select('*, fazendas(nome_fazenda)').eq('id', id).maybeSingle();
  }

  async createPivo(dados: any) {
    return await supabase.from('pivos').insert(dados).select().maybeSingle();
  }

  async updatePivo(id: string, dados: any) {
    return await supabase.from('pivos').update(dados).eq('id', id).select().maybeSingle();
  }

  async deletePivo(id: string) {
    return await supabase.from('pivos').delete().eq('id', id);
  }
}