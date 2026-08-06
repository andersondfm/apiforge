import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  sub: string | number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET || 'change-me';
    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(user: AuthUser): string {
  const secret = process.env.JWT_SECRET || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(user, secret, { expiresIn } as jwt.SignOptions);
}
