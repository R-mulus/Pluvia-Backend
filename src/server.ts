import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import router from './routes/api.routes.js';
import { AppError } from './shared/errors/AppError.js';

const app = express();

app.use(helmet());
app.use(cors());
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