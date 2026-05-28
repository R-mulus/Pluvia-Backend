/**
 * CAMINHO: src/routes/api.routes.ts
 * DESCRIÇÃO: Registro central das rotas da API Pluvia.
 */
import { Router, type Request, type Response } from 'express';

// Importando o Middleware de Autenticação
import { authMiddleware } from '../shared/middlewares/auth.middleware.js';

// Importando as rotas modulares
import { usuariosRoutes } from '../modules/cadastro/routes/usuarios.routes.js';
import { fazendasRoutes } from '../modules/cadastro/routes/fazendas.routes.js';
import { pivosRoutes } from '../modules/cadastro/routes/pivos.routes.js';
import { cronogramaRoutes } from '../modules/operacao/routes/cronograma.routes.js';
import { logsRoutes } from '../modules/operacao/routes/logs.routes.js';
import { telemetriaRoutes } from '../modules/telemetria/routes/telemetria.routes.js';
import { presetsRoutes } from '../modules/operacao/routes/presets.routes.js';

const router = Router();

// --- ROOT (Rota Pública - Não precisa de Auth) ---
router.get('/', (_req: Request, res: Response) => {
  res.json({ system: "Pluvia API", status: "online" });
});

// --- PLUGANDO OS MÓDULOS (Rotas Privadas) ---
// Adicionamos o `authMiddleware` antes de chamar as rotas. 
// Assim, ele protege TODOS os endpoints que estão lá dentro!
router.use('/usuarios', authMiddleware, usuariosRoutes);
router.use('/fazendas', authMiddleware, fazendasRoutes);
router.use('/pivos', authMiddleware, pivosRoutes);
router.use('/cronograma', authMiddleware, cronogramaRoutes);
router.use('/logs', authMiddleware, logsRoutes);
router.use('/telemetria', authMiddleware, telemetriaRoutes);
router.use('/presets', authMiddleware, presetsRoutes);


export { router as apiRoutes };