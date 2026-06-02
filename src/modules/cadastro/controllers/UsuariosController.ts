import type { Request, Response, NextFunction } from "express";
import { CadastroRepository } from "../repositories/CadastroRepository.js";
import { CadastroService } from "../services/CadastroService.js";
import {
  criarUsuarioSchema,
  UsuarioUpdateSchema,
} from "../schemas/cadastro.schema.js";

class UsuariosController {
  private cadastroRepo = new CadastroRepository();
  private cadastroService = new CadastroService(this.cadastroRepo);

  listarTodos = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarios = await this.cadastroService.listarUsuarios();

      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  };

  listarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuario = await this.cadastroService.buscarUsuarioPorId(
        req.params.id as string,
      );

      res.json({
        mensagem: "Usuário encontrado com sucesso!",
        dados: usuario,
      });
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = criarUsuarioSchema.parse(req.body);
      const novoUsuario =
        await this.cadastroService.criarUsuario(dadosValidados);

      res.status(201).json({
        mensagem: "Usuário criado com sucesso!",
        dados: novoUsuario,
      });
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = UsuarioUpdateSchema.parse(req.body);
      const usuarioAtualizado = await this.cadastroService.atualizarUsuario(
        req.params.id as string,
        dadosValidados as any,
      );

      res.json({
        mensagem: "Usuário atualizado com sucesso!",
        dados: usuarioAtualizado,
      });
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.cadastroService.deletarUsuario(req.params.id as string);

      res.status(200).json({
        mensagem: "Usuário excluído com sucesso!",
      });
    } catch (error) {
      next(error);
    }
  };
}

export const usuariosController = new UsuariosController();
