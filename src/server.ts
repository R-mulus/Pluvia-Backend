import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiRoutes as router } from './routes/api.routes.js';
import { AppError } from './shared/errors/AppError.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: "*",
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "Accept"
  ],
  credentials: true
}))
app.use(express.json());

// Registro do Roteador
app.use(router);

// Middleware Global de Erro
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }

  console.error('[SERVER_ERROR]:', err);
  return res.status(500).json({ status: 'error', message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[STATUS] Servidor Pluvia operativa em http://localhost:${PORT}`));