import type { Request, Response, NextFunction } from "express";
import { CronogramaRepository } from "../repositories/CronogramaRepository.js";
import { OperacaoService } from "../services/OperacaoService.js";
import { LogsRepository } from '../repositories/LogsRepository.js';
import {
  ComandoCronogramaSchema,
  ComandoUpdateSchema,
} from "../schemas/comando.schema.js";

class CronogramaController {
  private cronogramaRepository = new CronogramaRepository();
  private logsRepository = new LogsRepository();
  private operacaoService = new OperacaoService(this.cronogramaRepository, this.logsRepository);

  listar = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cronogramas = await this.operacaoService.listar();
      res.json(cronogramas);
    } catch (error) {
      next(error);
    }
  };

  agendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = ComandoCronogramaSchema.parse(req.body);
      const novoAgendamento =
        await this.operacaoService.agendar(dadosValidados);

      res.status(201).json({
        mensagem: "Comando agendado com sucesso!",
        dados: novoAgendamento,
      });
    } catch (error) {
      next(error);
    }
  };

  editar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Correção: Validação inserida antes de trafegar os dados para a camada de serviço
      const dadosValidados = ComandoUpdateSchema.parse(req.body);
      const agendamentoAtualizado = await this.operacaoService.atualizar(
        req.params.id as string,
        dadosValidados,
      );

      res.json({
        mensagem: "Agendamento atualizado com sucesso!",
        dados: agendamentoAtualizado,
      });
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.operacaoService.deletar(req.params.id as string);

      // Correção: Transição de status 204 para 200 para permitir payload textual
      res.status(200).json({
        mensagem: "Agendamento excluído com sucesso!",
      });
    } catch (error) {
      next(error);
    }
  };
}

export const cronogramaController = new CronogramaController();
