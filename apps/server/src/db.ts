import Database from 'better-sqlite3';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ConnectionConfig, GenerateConfig, GeneratedStack, ProjectRecord } from '@apiforge/shared';
import { decrypt, encrypt, ensureDataDir, getEncryptionKey, DATA_DIR } from './crypto.js';

export interface SavedConnection {
  id: string;
  name: string;
  engine: string;
  config: ConnectionConfig;
  createdAt: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  stack: string;
  created_at: string;
  config_json: string;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  ensureDataDir();
  getEncryptionKey();

  const dbPath = join(DATA_DIR, 'apiforge.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      stack TEXT NOT NULL,
      created_at TEXT NOT NULL,
      config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      engine TEXT NOT NULL,
      config_json_encrypted TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Mirror encryption key into meta if not already present
  const existing = database.prepare('SELECT value FROM meta WHERE key = ?').get('encryption_key') as
    | { value: string }
    | undefined;
  if (!existing) {
    const keyHex = getEncryptionKey().toString('hex');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('encryption_key', keyHex);
  }
}

export function listProjects(): Array<Pick<ProjectRecord, 'id' | 'name' | 'stack' | 'createdAt'>> {
  const rows = getDb()
    .prepare('SELECT id, name, stack, created_at FROM projects ORDER BY created_at DESC')
    .all() as Array<{ id: string; name: string; stack: string; created_at: string }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    stack: r.stack as GeneratedStack,
    createdAt: r.created_at,
  }));
}

export function getProject(id: string): ProjectRecord | null {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    stack: row.stack as GeneratedStack,
    createdAt: row.created_at,
    config: JSON.parse(row.config_json) as GenerateConfig,
  };
}

export function saveProject(config: GenerateConfig): ProjectRecord {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      'INSERT INTO projects (id, name, stack, created_at, config_json) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, config.projectName, config.stack, createdAt, JSON.stringify(config));

  return {
    id,
    name: config.projectName,
    stack: config.stack,
    createdAt,
    config,
  };
}

export function deleteProject(id: string): boolean {
  const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listConnections(): SavedConnection[] {
  const rows = getDb()
    .prepare(
      'SELECT id, name, engine, config_json_encrypted, created_at FROM connections ORDER BY created_at DESC',
    )
    .all() as Array<{
    id: string;
    name: string;
    engine: string;
    config_json_encrypted: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    engine: r.engine,
    config: JSON.parse(decrypt(r.config_json_encrypted)) as ConnectionConfig,
    createdAt: r.created_at,
  }));
}

export function saveConnection(name: string, config: ConnectionConfig): SavedConnection {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const encrypted = encrypt(JSON.stringify(config));

  getDb()
    .prepare(
      'INSERT INTO connections (id, name, engine, config_json_encrypted, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, name, config.engine, encrypted, createdAt);

  return { id, name, engine: config.engine, config, createdAt };
}

export function deleteConnection(id: string): boolean {
  const result = getDb().prepare('DELETE FROM connections WHERE id = ?').run(id);
  return result.changes > 0;
}
