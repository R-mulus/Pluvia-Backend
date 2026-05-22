import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase.js';
import { AppError } from '../errors/AppError.js';

// Estendemos a interface padrão do Express para que o nosso código saiba
// que, a partir deste middleware, o objeto `req` vai ter os dados do usuário.
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
    // 1. Procuramos o "crachá" no cabeçalho da requisição
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token de autenticação não fornecido.', 401);
    }

    // 2. O formato padrão mundial é "Bearer eyyJhbGciOiJIUz..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Formato de token inválido.', 401);
    }

    const token = parts[1];

    // 3. Pedimos ao Supabase para verificar se o token é autêntico e não expirou
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Token inválido ou expirado. Faça login novamente.', 401);
    }

    // 4. Token válido! Anexamos o ID do usuário à requisição.
    // Isso é super útil! Agora qualquer Rota ou Service saberá *quem* fez a requisição.
    req.user = {
      id: user.id,
      ...(user.email && { email: user.email }),
      ...(user.user_metadata?.cargo && { cargo: user.user_metadata.cargo })
    };

    // 5. Liberamos a passagem para a Rota (Controller)
    return next();

  } catch (error) {
    // Se der erro de autenticação, joga para o seu tratador de erros global
    return next(error);
  }
};