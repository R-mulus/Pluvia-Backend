import { TelemetriaRepository } from "../repositories/TelemetriaRepository.js";
import { AppError } from "../../../shared/errors/AppError.js";

export class TelemetriaService {
  private repository = new TelemetriaRepository();

  async obterDashboardCompleto() {
    const { data, error } = await this.repository.getDashboard();

    if (error) {
      throw new AppError(`Erro ao buscar telemetria: ${error.message}`, 500);
    }

    return data;
  }
}
