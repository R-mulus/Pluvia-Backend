import type { Request, Response, NextFunction } from 'express';
import { CadastroRepository } from '../repositories/CadastroRepository.js';
import { CadastroService } from '../services/CadastroService.js';
import { PivoUpdateSchema, criarPivoSchema } from '../schemas/cadastro.schema.js';

class PivosController {
  private cadastroRepo = new CadastroRepository();
  private cadastroService = new CadastroService(this.cadastroRepo);

  listarTodos = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pivos = await this.cadastroService.listarPivos();
      
      // Retorna a coleção direta. Geralmente listagens não exigem mensagem textual,
      // mas mantemos a estrutura limpa para o mapeamento no frontend.
      res.json(pivos);
    } catch (error) {
      next(error);
    }
  };

  listarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pivo = await this.cadastroService.buscarPivoPorId(req.params.id as string);
      
      res.json({
        mensagem: 'Pivô encontrado com sucesso!',
        dados: pivo
      });
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = criarPivoSchema.parse(req.body);
      const novoPivo = await this.cadastroService.criarPivo(dadosValidados);
      
      res.status(201).json({
        mensagem: 'Pivô criado com sucesso!',
        dados: novoPivo
      });
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = PivoUpdateSchema.parse(req.body);
      const pivoAtualizado = await this.cadastroService.atualizarPivo(req.params.id as string, dadosValidados as any);
      
      res.json({
        mensagem: 'Pivô atualizado com sucesso!',
        dados: pivoAtualizado
      });
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.cadastroService.deletarPivo(req.params.id as string);
      
      // Alterado de 204 para 200 para permitir o envio do payload JSON com a mensagem
      res.status(200).json({
        mensagem: 'Pivô excluído com sucesso!'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const pivosController = new PivosController();