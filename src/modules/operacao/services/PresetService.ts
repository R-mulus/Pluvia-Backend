import { PresetRepository } from '../repositories/PresetRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { CriarPresetDTO } from '../schemas/preset.schema.js';

export class PresetService {
  private repository = new PresetRepository();

  async listarPorPivo(pivoId: string) {
    try {
      return await this.repository.listarPorPivo(pivoId);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async criar(dados: CriarPresetDTO) {
    try {
      return await this.repository.criar(dados);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async deletar(id: string) {
    try {
      await this.repository.deletar(id);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }
}