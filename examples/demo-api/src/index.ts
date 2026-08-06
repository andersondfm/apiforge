import 'dotenv/config';
import express from 'express';
import { applySecurity } from './middleware/security.js';
import { setupSwagger } from './swagger.js';
import authRouter from './routes/auth.js';
import productsesRouter from './routes/products.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
applySecurity(app);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'demo-api' });
});

app.use('/auth', authRouter);
app.use('/productses', productsesRouter);

setupSwagger(app);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`[demo-api] listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});
