import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import { buildApp } from './app.js';
import { getDb } from './db.js';
import { ensureDataDir } from './crypto.js';
import { OUTPUT_DIR } from './routes/generate.js';

const PORT = 8787;
const HOST = '0.0.0.0';

async function main() {
  ensureDataDir();
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Initialize SQLite store (creates tables + encryption key)
  getDb();

  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`ApiForge server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
