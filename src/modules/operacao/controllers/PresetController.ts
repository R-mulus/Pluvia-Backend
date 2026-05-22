import { type Request, type Response, type NextFunction } from "express";
import { PresetRepository } from "../repositories/PresetRepository.js";

class PresetController {
  private repository = new PresetRepository();

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivo_id } = req.query;
      const presets = await this.repository.listarPorPivo(pivo_id as string);
      res.json(presets);
    } catch (error) { next(error); }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivo_id, nome, comando } = req.body;
      const criado_por = (req as any).user.id; // Extraído do JWT pelo authMiddleware
      
      const preset = await this.repository.criar(pivo_id, criado_por, nome, comando);
      res.status(201).json({ mensagem: "Preset criado!", dados: preset });
    } catch (error) { next(error); }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.repository.deletar(req.params.id as string);
      res.json({ mensagem: "Preset excluído!" });
    } catch (error) { next(error); }
  };
}

export const presetController = new PresetController();