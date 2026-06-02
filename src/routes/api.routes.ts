import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../shared/middlewares/auth.middleware.js";
import { usuariosRoutes } from "../modules/cadastro/routes/usuarios.routes.js";
import { fazendasRoutes } from "../modules/cadastro/routes/fazendas.routes.js";
import { pivosRoutes } from "../modules/cadastro/routes/pivos.routes.js";
import { cronogramaRoutes } from "../modules/operacao/routes/cronograma.routes.js";
import { logsRoutes } from "../modules/telemetria/routes/logs.routes.js";
import { telemetriaRoutes } from "../modules/telemetria/routes/telemetria.routes.js";
import { presetsRoutes } from "../modules/operacao/routes/presets.routes.js";

const router = Router();

// * Rota Pública (não precisa de Auth)
router.get("/", (_req: Request, res: Response) => {
  res.json({ system: "Pluvia API", status: "online" });
});

// * Rotas (Passamos o "AuthMiddleware" junto das rotas para autentificação)
router.use("/usuarios", authMiddleware, usuariosRoutes);
router.use("/fazendas", authMiddleware, fazendasRoutes);
router.use("/pivos", authMiddleware, pivosRoutes);
router.use("/cronograma", authMiddleware, cronogramaRoutes);
router.use("/logs", authMiddleware, logsRoutes);
router.use("/telemetria", authMiddleware, telemetriaRoutes);
router.use("/presets", authMiddleware, presetsRoutes);

export { router as apiRoutes };
