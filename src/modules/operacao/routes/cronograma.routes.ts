import { Router } from 'express';
import { cronogramaController } from '../controllers/CronogramaController.js';

const cronogramaRoutes = Router();

// Buscar todos os cronogramas do pivô
cronogramaRoutes.get('/', cronogramaController.listar);

// Agendar um novo cronograma com seus passos
cronogramaRoutes.post('/', cronogramaController.agendar);

// Excluir um cronograma inteiro
cronogramaRoutes.delete('/:id', cronogramaController.deletar);

// Adicione esta linha junto com as outras rotas:
cronogramaRoutes.patch('/:id/ativar', cronogramaController.ativar);

cronogramaRoutes.patch('/:id/controle', cronogramaController.controlar);

export { cronogramaRoutes };