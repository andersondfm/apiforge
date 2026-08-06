import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export interface Products {
  id: number;
  name: string;
  price: number;
  sku?: string;
}

function mapRow(row: Record<string, unknown>): Products {
  return {
    id: row['id'] as number,
    name: row['name'] as string,
    price: row['price'] as number,
    sku: row['sku'] as string,
  };
}

const router = Router();

/** List products */
router.get('/', authenticate, async (req, res, next) => {
  try {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const countResult = await query<{ total: number | string }>(`SELECT COUNT(*) AS total FROM "products"`, []);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const result = await query(`SELECT "id", "name", "price", "sku" FROM "products" ORDER BY 1 LIMIT ? OFFSET ?`, [limit, offset]);
  res.json({
    data: result.rows.map((r) => mapRow(r as Record<string, unknown>)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });
  } catch (err) {
    next(err);
  }
});

/** Get products by id */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await query(`SELECT "id", "name", "price", "sku" FROM "products" WHERE "id" = ?`, [id]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'Products not found' });
      return;
    }
    res.json(mapRow(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

/** Create products */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = req.body as Partial<Products>;
  const result = await query(
    `INSERT INTO "products" ("name", "price", "sku") VALUES (?, ?, ?)`,
    [body.name, body.price, body.sku],
  );
  res.status(201).json({ ok: true, affected: result.rowCount });
  } catch (err) {
    next(err);
  }
});

/** Update products */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body as Partial<Products>;
    const result = await query(
      `UPDATE "products" SET "name" = ?, "price" = ?, "sku" = ? WHERE "id" = ?`,
      [body.name, body.price, body.sku, id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: 'Products not found' });
      return;
    }
    const fresh = await query(`SELECT "id", "name", "price", "sku" FROM "products" WHERE "id" = ?`, [id]);
    res.json(fresh.rows[0] ? mapRow(fresh.rows[0] as Record<string, unknown>) : { ok: true });
  } catch (err) {
    next(err);
  }
});

/** Delete products */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await query(`DELETE FROM "products" WHERE "id" = ?`, [id]);
    if (!result.rowCount) {
      res.status(404).json({ error: 'Products not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
