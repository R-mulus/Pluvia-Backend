import type { Request, Response, NextFunction } from "express";
import { PresetService } from "../services/PresetService.js";
import { PresetSchema } from "../schemas/preset.schema.js";
import type { AuthRequest } from "../../../shared/middlewares/auth.middleware.js";

class PresetController {
  private service = new PresetService();

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivo_id } = req.query;
      const presets = await this.service.listarPorPivo(pivo_id as string);
      res.json(presets);
    } catch (error) { next(error); }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const criado_por = authReq.user?.id;
      if (!criado_por) throw new Error("Usuário não autenticado");

      // Validação Zod
      const dadosValidados = PresetSchema.parse(req.body);
      
      const preset = await this.service.criar({ ...dadosValidados, criado_por });
      res.status(201).json({ mensagem: "Preset criado!", dados: preset });
    } catch (error) { next(error); }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deletar(req.params.id as string);
      res.json({ mensagem: "Preset excluído!" });
    } catch (error) { next(error); }
  };
}

export const presetController = new PresetController();