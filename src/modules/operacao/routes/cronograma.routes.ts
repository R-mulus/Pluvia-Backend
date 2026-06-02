import { Router } from "express";
import { cronogramaController } from "../controllers/CronogramaController.js";

const cronogramaRoutes = Router();

cronogramaRoutes.get("/", cronogramaController.listar);
cronogramaRoutes.post("/", cronogramaController.agendar);
cronogramaRoutes.delete("/:id", cronogramaController.deletar);
cronogramaRoutes.patch("/:id/ativar", cronogramaController.ativar);
cronogramaRoutes.patch("/:id/controle", cronogramaController.controlar);

export { cronogramaRoutes };
