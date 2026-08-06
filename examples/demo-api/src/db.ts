import Database from 'better-sqlite3';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DATABASE_URL || './data/app.db';
const dir = path.dirname(dbPath);
if (dir && dir !== '.' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
    const rows = db.prepare(text).all(...params) as T[];
    return { rows, rowCount: rows.length };
  }
  const info = db.prepare(text).run(...params);
  return { rows: [] as T[], rowCount: info.changes };
}

export default db;
