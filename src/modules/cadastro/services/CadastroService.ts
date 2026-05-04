import { CadastroRepository } from '../repositories/CadastroRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class CadastroService {
  private repo = new CadastroRepository();

  // --- USUÁRIOS ---
  async listarUsuarios() {
    const { data, error } = await this.repo.listUsuarios();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarUsuario(id: string) {
    const { data, error } = await this.repo.getUsuarioById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Utilizador não encontrado", 404);
    return data;
  }

  async criarUsuario(dados: any) {
    const { data, error } = await this.repo.createUsuario(dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async editarUsuario(id: string, dados: any) {
    const { data, error } = await this.repo.updateUsuario(id, dados);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Utilizador não encontrado para atualização", 404);
    return data;
  }

  async excluirUsuario(id: string) {
    const { temFazendas, temOperacoes } = await this.repo.getUsuarioRelacoes(id);

    if (temFazendas) throw new AppError("Impossível eliminar: Utilizador é proprietário de uma ou mais fazendas.");
    if (temOperacoes) throw new AppError("Impossível eliminar: Utilizador está vinculado como operador de pivôs.");

    const { error } = await this.repo.deleteUsuario(id);
    if (error) throw new AppError(error.message);
  }

  // --- FAZENDAS ---
  async listarFazendas() {
    const { data, error } = await this.repo.listFazendas();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarFazenda(id: string) {
    const { data, error } = await this.repo.getFazendaById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Fazenda não encontrada", 404);
    return data;
  }

  async criarFazenda(dados: any) {
    const { data, error } = await this.repo.createFazenda(dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async editarFazenda(id: string, dados: any) {
    const { data, error } = await this.repo.updateFazenda(id, dados);
    if (error) throw new AppError(error.message);
    
    // Se o ID não existe, o repositório retorna null, e aqui disparamos o 404
    if (!data) throw new AppError("Fazenda não encontrada para atualização", 404);
    
    return data;
  }

  async excluirFazenda(id: string) {
    const temPivos = await this.repo.getPivosDaFazenda(id);
    if (temPivos) throw new AppError("Impossível eliminar: Esta fazenda ainda possui pivôs registados.");

    const { error } = await this.repo.deleteFazenda(id);
    if (error) throw new AppError(error.message);
  }

  // --- PIVÔS ---
  async listarPivos() {
    const { data, error } = await this.repo.listPivos();
    if (error) throw new AppError(error.message);
    return data;
  }

  async buscarPivo(id: string) {
    const { data, error } = await this.repo.getPivoById(id);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Pivô não encontrado", 404);
    return data;
  }

  async criarPivo(dados: any) {
    const { data, error } = await this.repo.createPivo(dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async editarPivo(id: string, dados: any) {
    const { data, error } = await this.repo.updatePivo(id, dados);
    if (error) throw new AppError(error.message);
    if (!data) throw new AppError("Pivô não encontrado para atualização", 404);
    return data;
  }

  async excluirPivo(id: string) {
    const { error } = await this.repo.deletePivo(id);
    if (error) throw new AppError(error.message);
  }
}