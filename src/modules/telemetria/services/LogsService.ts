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

  async registrarEvento(dados: InsertEventLogDTO) {
    try {
      // Blindagem Absoluta: Tenta criar o log no banco
      const data = await this.repository.createEventLog(dados);
      return data;
    } catch (error: any) {
      // Se falhar (ex: Foreign Key apagada, enum errado), avisa no console mas NÃO quebra o App!
      console.warn("\n[LOG WARNING] Falha silenciosa ao registrar auditoria:");
      console.warn(error.message);
      return null;
    }
  }
}