import { Router } from "express";
import { logsController } from "../controllers/LogsController.js";

const logsRoutes = Router();

// Exemplo de chamada: GET /operacao/logs/eventos/ID_DO_PIVO?limit=10
logsRoutes.get("/eventos/:pivoId", logsController.listarEventos);
logsRoutes.get("/conexao/:pivoId", logsController.listarConexao);
// NOVA ROTA (Coloque antes do /eventos/:pivoId)
logsRoutes.get("/alertas", logsController.listarAlertas);

export { logsRoutes };
