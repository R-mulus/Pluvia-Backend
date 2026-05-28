import { supabase } from '../../../config/supabase.js';
import { 
  type CriarUsuarioDTO, 
  type CriarFazendaDTO, 
  type CriarPivoDTO 
} from '../schemas/cadastro.schema.js';

export class CadastroRepository {
  // ==========================================
  // 1. DOMÍNIO: USUÁRIOS
  // ==========================================

  async listUsuarios() {
    return await supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });
  }

  async getUsuarioById(id: string) {
    return await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle();
  }

  async createUsuario(dados: CriarUsuarioDTO) {
    return await supabase
      .from('usuarios')
      .insert(dados)
      .select()
      .maybeSingle();
  }

  async updateUsuario(id: string, dados: Partial<CriarUsuarioDTO>) {
    return await supabase
      .from('usuarios')
      .update(dados)
      .eq('id', id)
      .select()
      .maybeSingle();
  }

  async getUsuarioRelacoes(id: string) {
    const { count: fazendas } = await supabase
      .from('fazendas')
      .select('*', { count: 'exact', head: true })
      .eq('proprietario_id', id);

    const { count: operacoes } = await supabase
      .from('pivo_operadores')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', id);
    
    return {
      temFazendas: (fazendas || 0) > 0,
      temOperacoes: (operacoes || 0) > 0
    };
  }

  async deleteUsuario(id: string) {
    return await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
  }

  // ==========================================
  // 2. DOMÍNIO: FAZENDAS
  // ==========================================

  async listFazendas() {
    return await supabase
      .from('fazendas')
      .select('*, usuarios(nome)')
      .order('nome_fazenda');
  }

  async getFazendaById(id: string) {
    return await supabase
      .from('fazendas')
      .select('*, usuarios(nome)')
      .eq('id', id)
      .maybeSingle();
  }

  async createFazenda(dados: CriarFazendaDTO) {
    // Normalizado para retornar a assinatura padrão { data, error }
    return await supabase
      .from('fazendas')
      .insert(dados)
      .select()
      .maybeSingle();
  }

  async updateFazenda(id: string, dados: Partial<CriarFazendaDTO>) {
    return await supabase
      .from('fazendas')
      .update(dados)
      .eq('id', id)
      .select()
      .maybeSingle();
  }

  async getPivosDaFazenda(fazendaId: string) {
    const { count } = await supabase
      .from('pivos')
      .select('*', { count: 'exact', head: true })
      .eq('fazenda_id', fazendaId);
      
    return (count || 0) > 0;
  }

  async deleteFazenda(id: string) {
    return await supabase
      .from('fazendas')
      .delete()
      .eq('id', id);
  }

  // ==========================================
  // 3. DOMÍNIO: PIVÔS
  // ==========================================

  async listPivos() {
    return await supabase
      .from('pivos')
      .select('*, fazendas(nome_fazenda)')
      .order('nome_pivo');
  }

  async getPivoById(id: string) {
    return await supabase
      .from('pivos')
      .select('*, fazendas(nome_fazenda)')
      .eq('id', id)
      .maybeSingle();
  }

  async createPivo(dados: CriarPivoDTO) {
    // 1. Desestruturamos o objeto para separar o ID do operador do resto do pivô
    const { operador_id, ...dadosDoPivo } = dados;

    // 2. Inserimos o Pivô na tabela pivos
    const { data: pivo, error: pivoError } = await supabase
      .from('pivos')
      .insert(dadosDoPivo)
      .select()
      .maybeSingle();

    if (pivoError || !pivo) {
      return { data: null, error: pivoError };
    }

    // 3. Se um operador foi enviado, inserimos a relação na tabela intermediária
    if (operador_id) {
      const { error: operadorError } = await supabase
        .from('pivo_operadores')
        .insert({
          pivo_id: pivo.id,
          usuario_id: operador_id
        });
      
      // Se a vinculação falhar, retornamos o erro para a camada Service
      if (operadorError) return { data: null, error: operadorError };
    }

    return { data: pivo, error: null };
  }

  async updatePivo(id: string, dados: Partial<CriarPivoDTO>) {
    return await supabase
      .from('pivos')
      .update(dados)
      .eq('id', id)
      .select()
      .maybeSingle();
  }

  async deletePivo(id: string) {
    return await supabase
      .from('pivos')
      .delete()
      .eq('id', id);
  }
}