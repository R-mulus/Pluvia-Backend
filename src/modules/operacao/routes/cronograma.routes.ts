import { Router } from 'express';
import { cronogramaController } from '../controllers/CronogramaController.js';

const cronogramaRoutes = Router();

cronogramaRoutes.get('/', cronogramaController.listar);
cronogramaRoutes.post('/', cronogramaController.agendar);
cronogramaRoutes.patch('/:id', cronogramaController.editar);
cronogramaRoutes.delete('/:id', cronogramaController.deletar);

export { cronogramaRoutes };