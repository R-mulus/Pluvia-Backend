import { Router } from "express";
import { logsController } from "../controllers/LogsController.js";

const logsRoutes = Router();

logsRoutes.get("/eventos/:pivoId", logsController.listarEventos);
logsRoutes.get("/conexao/:pivoId", logsController.listarConexao);
logsRoutes.get("/alertas", logsController.listarAlertas);

export { logsRoutes };
