import { Router } from 'express';
import { fazendasController } from '../controllers/FazendasController.js';

const fazendasRoutes = Router();

fazendasRoutes.get('/', fazendasController.listarTodas);
fazendasRoutes.get('/:id', fazendasController.listarPorId);
fazendasRoutes.post('/', fazendasController.criar);
fazendasRoutes.patch('/:id', fazendasController.atualizar);
fazendasRoutes.delete('/:id', fazendasController.deletar);

export { fazendasRoutes };