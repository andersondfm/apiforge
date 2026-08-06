import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const result = await query<{ id: string | number; username: string; password: string }>(
      `SELECT "id" AS id, "username" AS username, "password" AS password FROM "users" WHERE "username" = ?`,
      [username],
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ sub: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const existing = await query(`SELECT "id" AS id, "username" AS username, "password" AS password FROM "users" WHERE "username" = ?`, [username]);
    if (existing.rows.length) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(`INSERT INTO "users" ("username", "password") VALUES (?, ?)`, [username, hash]);
    const id = (result.rows[0] as { id?: string | number } | undefined)?.id ?? 'new';
    const token = signToken({ sub: id, username });
    res.status(201).json({ token, user: { id, username } });
  } catch (err) {
    next(err);
  }
});

export default router;
