import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase.js';
import { AppError } from '../errors/AppError.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    cargo?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
   
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token de autenticação não fornecido.', 401);
    }

    // * Normalmente o padrão do token é "Bearer eyyJhbGciOiJIUz..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Formato de token inválido.', 401);
    }

    const token = parts[1];

    // * Verificação do Supabase para ver se o token é autêntico e não expirou
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Token inválido ou expirado. Faça login novamente.', 401);
    }

    // * Caso o token seja válido, os ID do usuário é anexado à requisição. Dessa forma o Service sabe quem fez a requisição
    req.user = {
      id: user.id,
      ...(user.email && { email: user.email }),
      ...(user.user_metadata?.cargo && { cargo: user.user_metadata.cargo })
    };

    // * Quando estiver tudo certo a rota é liberada para o controller
    return next();

  } catch (error) {
    return next(error);
  }
};