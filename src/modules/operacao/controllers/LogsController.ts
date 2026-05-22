import type { Request, Response, NextFunction } from 'express';
import { CronogramaRepository } from '../repositories/CronogramaRepository.js';
import { LogsRepository } from '../repositories/LogsRepository.js';
import { OperacaoService } from '../services/OperacaoService.js';

class LogsController {
  private cronogramaRepository = new CronogramaRepository();
  private logsRepository = new LogsRepository();
  
  // Compartilha a mesma instância de serviço injetando ambos os repositórios
  private operacaoService = new OperacaoService(this.cronogramaRepository, this.logsRepository);

  listarEventos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivoId } = req.params;
      // Garante que o limite seja um número inteiro, padrão 50 (conforme RF06)
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const logs = await this.operacaoService.listarLogsEventos(pivoId as string, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  };

  listarConexao = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivoId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 24;

      const logs = await this.operacaoService.listarLogsConexao(pivoId as string, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  };
}

export const logsController = new LogsController();