import { type Request, type Response, type NextFunction } from "express";
import { TelemetriaService } from "../services/TelemetriaService.js";

class TelemetriaController {
  private service = new TelemetriaService();

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = await this.service.obterDashboardCompleto();
      // Usamos o padrão de envelope (DefaultResponse) que combinamos
      res.json({ mensagem: "Dashboard carregado", dados });
    } catch (error) {
      next(error);
    }
  };
}

export const telemetriaController = new TelemetriaController();
