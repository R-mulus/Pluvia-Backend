import type { Request, Response, NextFunction } from "express";
import { CadastroRepository } from "../repositories/CadastroRepository.js";
import { CadastroService } from "../services/CadastroService.js";
import {
  FazendaUpdateSchema,
  criarFazendaSchema,
} from "../schemas/cadastro.schema.js";

class FazendasController {
  private cadastroRepo = new CadastroRepository();
  private cadastroService = new CadastroService(this.cadastroRepo);

  listarTodas = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const fazendas = await this.cadastroService.listarFazendas();
      res.json(fazendas);
    } catch (error) {
      next(error);
    }
  };

  listarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fazenda = await this.cadastroService.buscarFazendaPorId(
        req.params.id as string,
      );

      res.json({
        mensagem: "Fazenda encontrada com sucesso!",
        dados: fazenda,
      });
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = criarFazendaSchema.parse(req.body);
      const novaFazenda =
        await this.cadastroService.criarFazenda(dadosValidados);

      res.status(201).json({
        mensagem: "Fazenda criada com sucesso!",
        dados: novaFazenda,
      });
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = FazendaUpdateSchema.parse(req.body);
      const fazendaAtualizada = await this.cadastroService.atualizarFazenda(
        req.params.id as string,
        dadosValidados as any,
      );

      res.json({
        mensagem: "Fazenda atualizada com sucesso!",
        dados: fazendaAtualizada,
      });
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.cadastroService.deletarFazenda(req.params.id as string);

      res.status(200).json({
        mensagem: "Fazenda excluída com sucesso!",
      });
    } catch (error) {
      next(error);
    }
  };
}

export const fazendasController = new FazendasController();
