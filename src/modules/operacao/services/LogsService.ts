import { LogsRepository } from '../repositories/LogsRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class LogsService {
  private repository = new LogsRepository();

  async listarLogsEventos(pivoId: string, limit: number) {
    const { data, error } = await this.repository.listEventLogs(pivoId, limit);
    if (error) throw new AppError(error.message);
    return data;
  }

  async listarLogsConexao(pivoId: string, limit: number) {
    const { data, error } = await this.repository.listConectLogs(pivoId, limit);
    if (error) throw new AppError(error.message);
    return data;
  }
}