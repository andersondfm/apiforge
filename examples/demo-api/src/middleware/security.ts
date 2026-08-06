import type { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function applySecurity(app: Express): void {
  if (process.env.HELMET_ENABLED !== 'false' && true) {
    app.use(helmet());
  }

  const corsMode = process.env.CORS_MODE || 'origins';
  if (corsMode === 'all') {
    app.use(cors());
  } else if (corsMode === 'origins') {
    const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    app.use(
      cors({
        origin: (origin, cb) => {
          if (!origin || origins.includes(origin)) cb(null, true);
          else cb(new Error('Not allowed by CORS'));
        },
        credentials: true,
      }),
    );
  }

  const allowedIps = (process.env.ALLOWED_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedIps.length > 0) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
      if (!allowedIps.includes(ip) && !allowedIps.includes(req.ip || '')) {
        res.status(403).json({ error: 'IP not allowed' });
        return;
      }
      next();
    });
  }

  const rateEnabled = (process.env.RATE_LIMIT_ENABLED || 'true') === 'true' || true;
  if (rateEnabled && process.env.RATE_LIMIT_ENABLED !== 'false') {
    const windowMs = 60_000;
    const max = Number(process.env.RATE_LIMIT_PER_MINUTE || 100);
    app.use(
      rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests' },
      }),
    );
  }

  const apiKeyEnabled = (process.env.API_KEY_ENABLED || 'false') === 'true' || false;
  if (apiKeyEnabled && process.env.API_KEY_ENABLED !== 'false') {
    const headerName = (process.env.API_KEY_HEADER || 'x-api-key').toLowerCase();
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/health') || req.path.startsWith('/api-docs') || req.path.startsWith('/auth')) {
        next();
        return;
      }
      const key = req.headers[headerName];
      if (!key || key !== process.env.API_KEY) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }
      next();
    });
  }
}
