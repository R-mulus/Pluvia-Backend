import type { Request, Response, NextFunction } from "express";
import { LogsService } from "../services/LogsService.js";

class LogsController {
  private logsService = new LogsService();

  listarEventos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivoId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;

      const logs = await this.logsService.listarLogsEventos(
        pivoId as string,
        limit,
      );
      res.json(logs);
    } catch (error) {
      next(error);
    }
  };

  listarAlertas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivoId } = req.query;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;

      const alertas = await this.logsService.listarAlertas(
        limit,
        pivoId as string,
      );
      res.json(alertas);
    } catch (error) {
      next(error);
    }
  };

  listarConexao = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivoId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 24;

      const logs = await this.logsService.listarLogsConexao(
        pivoId as string,
        limit,
      );
      res.json(logs);
    } catch (error) {
      next(error);
    }
  };
}

export const logsController = new LogsController();
