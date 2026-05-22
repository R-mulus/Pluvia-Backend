import { Router } from 'express';
import { usuariosController } from '../controllers/UsuariosController.js';

const usuariosRoutes = Router();

usuariosRoutes.get('/', usuariosController.listarTodos);
usuariosRoutes.get('/:id', usuariosController.listarPorId);
usuariosRoutes.post('/', usuariosController.criar);
usuariosRoutes.patch('/:id', usuariosController.atualizar);
usuariosRoutes.delete('/:id', usuariosController.deletar);

export { usuariosRoutes };