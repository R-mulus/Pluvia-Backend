import { CronogramaRepository } from '../repositories/CronogramaRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class CronogramaService {
  private repo = new CronogramaRepository();
  private statusBloqueados = ['executando', 'concluido', 'falha', 'cancelado', 'interrompido'];

  async listar() {
    const { data, error } = await this.repo.list();
    if (error) throw new AppError(error.message);
    return data;
  }

  async agendar(dados: any) {
    // Aqui poderiam entrar validações de choque de horário no futuro
    const { data, error } = await this.repo.create({
      ...dados,
      status_final: 'aguardando'
    });

    if (error) throw new AppError(error.message);
    return data;
  }

  async editarComando(id: string, dados: any) {
    const { data: cmd, error: errorBusca } = await this.repo.getById(id);
    
    if (errorBusca || !cmd) throw new AppError("Comando não encontrado", 404);

    if (cmd.status_final !== 'aguardando') {
      throw new AppError(`Edição proibida: Comando está com status '${cmd.status_final}'`);
    }

    const { data, error } = await this.repo.update(id, dados);
    if (error) throw new AppError(error.message);
    return data;
  }

  async excluirComando(id: string) {
    const { data: cmd, error: errorBusca } = await this.repo.getById(id);
    
    if (errorBusca || !cmd) throw new AppError("Comando não encontrado", 404);

    if (this.statusBloqueados.includes(cmd.status_final)) {
      throw new AppError(`Exclusão proibida: Comandos em estado '${cmd.status_final}' não podem ser removidos.`);
    }

    const { error } = await this.repo.delete(id);
    if (error) throw new AppError(error.message);
  }
}