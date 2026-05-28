import type { Request, Response, NextFunction } from "express";
import { CronogramaService } from "../services/CronogramaService.js";
import { CronogramaRepository } from "../repositories/CronogramaRepository.js";
import { LogsRepository } from "../repositories/LogsRepository.js";
import { CronogramaSchema } from "../schemas/cronograma.schema.js";
import type { AuthRequest } from "../../../shared/middlewares/auth.middleware.js";

class CronogramaController {
  // Instanciando o serviço refatorado
  private service = new CronogramaService(
    new CronogramaRepository(),
    new LogsRepository()
  );

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pivo_id } = req.query;
      const cronogramas = await this.service.listarPorPivo(pivo_id as string);
      res.json(cronogramas);
    } catch (error) { next(error); }
  };

  agendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const criado_por = authReq.user?.id;
      if (!criado_por) throw new Error("Usuário não autenticado");

      const dadosValidados = CronogramaSchema.parse(req.body);
      
      const novoAgendamento = await this.service.agendar({ ...dadosValidados, criado_por });
      res.status(201).json({ mensagem: "Cronograma agendado!", dados: novoAgendamento });
    } catch (error) { next(error); }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deletar(req.params.id as string);
      res.status(200).json({ mensagem: "Agendamento excluído com sucesso!" });
    } catch (error) { next(error); }
  };


  ativar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { pivo_id } = req.body; // Precisamos do pivo_id para desativar os outros

      if (!pivo_id) throw new Error("ID do pivô é obrigatório");

      const ativado = await this.service.ativar(id as string, pivo_id);
      res.status(200).json({ mensagem: "Cronograma ativado com sucesso!", dados: ativado });
    } catch (error) { next(error); }
  };

  controlar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { acao } = req.body; // 'iniciar', 'pausar', 'continuar'

      if (!['iniciar', 'pausar', 'continuar'].includes(acao)) {
        throw new Error("Ação inválida");
      }

      const atualizado = await this.service.controlar(id as string, acao as any);
      res.status(200).json({ mensagem: `Comando de ${acao} recebido com sucesso!`, dados: atualizado });
    } catch (error) { next(error); }
  };

  
}

export const cronogramaController = new CronogramaController();