import { Router } from "express";
import { telemetriaController } from "../controllers/TelemetriaController.js";

const telemetriaRoutes = Router();

telemetriaRoutes.get("/dashboard", telemetriaController.getDashboard);

export { telemetriaRoutes };
