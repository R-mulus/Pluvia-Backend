import { CadastroRepository } from '../repositories/CadastroRepository.js';
import { 
  type CriarUsuarioDTO, 
  type CriarFazendaDTO, 
  type CriarPivoDTO
} from '../schemas/cadastro.schema.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class CadastroService {
  // Injeção de dependência única. O atributo 'cadastroRepository' fica disponível automaticamente.
  constructor(private cadastroRepository: CadastroRepository) {}

  // ==========================================
  // 1. DOMÍNIO: USUÁRIOS
  // ==========================================
  
  async listarUsuarios() {
    const { data, error } = await this.cadastroRepository.listUsuarios();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarUsuarioPorId(id: string) {
    const { data, error } = await this.cadastroRepository.getUsuarioById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Usuário não encontrado", 404);
    return data;
  }

  async criarUsuario(dados: CriarUsuarioDTO) {
    const { data, error } = await this.cadastroRepository.createUsuario(dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async atualizarUsuario(id: string, dados: Partial<CriarUsuarioDTO>) {
    const { data, error } = await this.cadastroRepository.updateUsuario(id, dados);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Usuário não encontrado para atualização", 404);
    return data;
  }

  async deletarUsuario(id: string) {
    const { temFazendas, temOperacoes } = await this.cadastroRepository.getUsuarioRelacoes(id);

    if (temFazendas) throw new AppError("Impossível eliminar: Usuário é proprietário de uma ou mais fazendas.", 400);
    if (temOperacoes) throw new AppError("Impossível eliminar: Usuário está vinculado como operador de pivôs.", 400);

    const { error } = await this.cadastroRepository.deleteUsuario(id);
    if (error) throw new AppError(error.message);
  }

  // ==========================================
  // 2. DOMÍNIO: FAZENDAS
  // ==========================================
  
  async listarFazendas() {
    const { data, error } = await this.cadastroRepository.listFazendas();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarFazendaPorId(id: string) {
    const { data, error } = await this.cadastroRepository.getFazendaById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Fazenda não encontrada", 404);
    return data;
  }

  async criarFazenda(dados: CriarFazendaDTO) {
    // REGRA DE NEGÓCIO: Verificar se o proprietário (usuário) realmente existe antes do insert
    const { data: proprietario, error: errProp } = await this.cadastroRepository.getUsuarioById(dados.proprietario_id);
    
    if (errProp || !proprietario) {
      throw new AppError('O proprietário especificado não foi encontrado no sistema.', 404);
    }

    const { data, error } = await this.cadastroRepository.createFazenda(dados);
    if (error) throw new AppError(error.message);
    
    return data;
  }

  async atualizarFazenda(id: string, dados: Partial<CriarFazendaDTO>) {
    const { data, error } = await this.cadastroRepository.updateFazenda(id, dados);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Fazenda não encontrada para atualização", 404);
    return data;
  }

  async deletarFazenda(id: string) {
    const temPivos = await this.cadastroRepository.getPivosDaFazenda(id);
    if (temPivos) throw new AppError("Impossível eliminar: Esta fazenda ainda possui pivôs registrados.", 400);

    const { error } = await this.cadastroRepository.deleteFazenda(id);
    if (error) throw new AppError(error.message);
  }

  // ==========================================
  // 3. DOMÍNIO: PIVÔS
  // ==========================================
  
  async listarPivos() {
    const { data, error } = await this.cadastroRepository.listPivos();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarPivoPorId(id: string) {
    const { data, error } = await this.cadastroRepository.getPivoById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Pivô não encontrado", 404);
    return data;
  }

  async criarPivo(dados: CriarPivoDTO) {
    // Futura integração do requisito RF02 (Regra de teste de ping de hardware) será acoplada aqui
    const { data, error } = await this.cadastroRepository.createPivo(dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async atualizarPivo(id: string, dados: Partial<CriarPivoDTO>) {
    const { data, error } = await this.cadastroRepository.updatePivo(id, dados);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Pivô não encontrado para atualização", 404);
    return data;
  }

  async deletarPivo(id: string) {
    const { error } = await this.cadastroRepository.deletePivo(id);
    if (error) throw new AppError(error.message);
  }
}