import { LogsRepository, type InsertEventLogDTO } from "../repositories/LogsRepository.js";
import { AppError } from "../../../shared/errors/AppError.js";

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

  async listarAlertas(limit: number, pivoId?: string) {
    const { data, error } = await this.repository.listAlertas(limit, pivoId);
    if (error) throw new AppError(error.message);
    return data;
  }

  async registrarEvento(dados: InsertEventLogDTO) {
    try {
      const data = await this.repository.createEventLog(dados);
      return data;
    } catch (error: any) {
      console.warn("\n[LOG WARNING] Falha silenciosa ao registrar auditoria:");
      console.warn(error.message);
      return null;
    }
  }
}