import { Router } from 'express';
import { presetController } from '../controllers/PresetController.js';

const presetsRoutes = Router();

presetsRoutes.get('/', presetController.listar);
presetsRoutes.post('/', presetController.criar);
presetsRoutes.delete('/:id', presetController.deletar);

export { presetsRoutes };