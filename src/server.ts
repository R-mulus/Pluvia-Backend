import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiRoutes as router } from './routes/api.routes.js';
import { AppError } from './shared/errors/AppError.js';

const app = express();

app.use(helmet());

// * Certificando que não vai haver erro de CORS
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
app.use(router);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }

  console.error('[SERVER_ERROR]:', err);
  return res.status(500).json({ status: 'error', message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[STATUS] Servidor Pluvia operativo em http://localhost:${PORT}`));