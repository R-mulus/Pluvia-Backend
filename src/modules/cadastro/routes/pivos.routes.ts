import { Router } from 'express';
import { pivosController } from '../controllers/PivosController.js';

const pivosRoutes = Router();

pivosRoutes.get('/', pivosController.listarTodos);
pivosRoutes.get('/:id', pivosController.listarPorId);
pivosRoutes.post('/', pivosController.criar);
pivosRoutes.patch('/:id', pivosController.atualizar);
pivosRoutes.delete('/:id', pivosController.deletar);

export { pivosRoutes };