#!/usr/bin/env node
/**
 * Ensure ApiForge test databases are running.
 * Reuses healthy containers (e.g. existing apiforge-mysql) instead of recreating them.
 *
 * Usage: node scripts/ensure-dbs.mjs [--mysql] [--postgres] [--sqlserver] [--all]
 * Default: --all
 */
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENGINES = {
  mysql: {
    name: 'mysql',
    container: 'apiforge-mysql',
    composeDir: path.join(__dirname, 'mysql'),
    waitMs: 120_000,
  },
  postgres: {
    name: 'postgres',
    container: 'apiforge-postgres',
    composeDir: path.join(__dirname, 'postgres'),
    waitMs: 120_000,
    afterHealthy: migratePostgres,
  },
  sqlserver: {
    name: 'sqlserver',
    container: 'apiforge-mssql',
    composeDir: path.join(__dirname, 'sqlserver'),
    waitMs: 180_000,
    afterHealthy: seedSqlServer,
  },
};

function docker(args, opts = {}) {
  return execFileAsync('docker', args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    ...opts,
  });
}

async function containerExists(name) {
  try {
    const { stdout } = await docker(['inspect', '-f', '{{.Id}}', name]);
    return Boolean(stdout.trim());
  } catch {
    return false;
  }
}

async function healthStatus(name) {
  try {
    const { stdout } = await docker(['inspect', '-f', '{{.State.Health.Status}}', name]);
    return stdout.trim();
  } catch {
    return 'missing';
  }
}

async function isRunning(name) {
  try {
    const { stdout } = await docker(['inspect', '-f', '{{.State.Running}}', name]);
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function waitHealthy(container, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let status = 'unknown';
  while (Date.now() < deadline) {
    status = await healthStatus(container);
    if (status === 'healthy') return;
    await sleep(2000);
  }
  throw new Error(`${container} not healthy after ${timeoutMs}ms (last: ${status})`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function composeUp(composeDir) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', 'up', '-d'], {
      cwd: composeDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker compose up failed in ${composeDir} (exit ${code})`));
    });
  });
}

async function migratePostgres() {
  // Align active to SMALLINT for engines that already seeded BOOLEAN.
  console.log('  Ensuring Postgres products.active is SMALLINT...');
  await docker([
    'exec',
    'apiforge-postgres',
    'psql',
    '-U',
    'demo',
    '-d',
    'demo',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'active' AND data_type = 'boolean'
      ) THEN
        ALTER TABLE products ALTER COLUMN active DROP DEFAULT;
        ALTER TABLE products ALTER COLUMN active TYPE SMALLINT USING CASE WHEN active THEN 1 ELSE 0 END;
        ALTER TABLE products ALTER COLUMN active SET DEFAULT 1;
      END IF;
    END $$;`,
  ]);
}

async function seedSqlServer() {
  console.log('  Applying SQL Server seed...');
  await docker([
    'exec',
    'apiforge-mssql',
    '/opt/mssql-tools18/bin/sqlcmd',
    '-C',
    '-S',
    'localhost',
    '-U',
    'sa',
    '-P',
    'Your_strong_Password123',
    '-i',
    '/init/01-seed.sql',
  ]);
}

async function ensureEngine(key) {
  const eng = ENGINES[key];
  if (!eng) throw new Error(`Unknown engine: ${key}`);

  const status = await healthStatus(eng.container);
  if (status === 'healthy') {
    console.log(`[${eng.name}] ${eng.container} already healthy — reusing`);
    if (eng.afterHealthy) {
      try {
        await eng.afterHealthy();
      } catch (err) {
        console.warn(`  Seed warning (continuing): ${err.message}`);
      }
    }
    return { engine: eng.name, reused: true };
  }

  const exists = await containerExists(eng.container);
  if (exists) {
    const running = await isRunning(eng.container);
    if (!running) {
      console.log(`[${eng.name}] Starting existing container ${eng.container}...`);
      await docker(['start', eng.container]);
    } else {
      console.log(`[${eng.name}] Waiting for ${eng.container} to become healthy...`);
    }
  } else {
    console.log(`[${eng.name}] Creating via docker compose (${eng.composeDir})...`);
    await composeUp(eng.composeDir);
  }

  await waitHealthy(eng.container, eng.waitMs);
  console.log(`[${eng.name}] healthy`);
  if (eng.afterHealthy) await eng.afterHealthy();
  return { engine: eng.name, reused: false };
}

export async function ensureDbs(engines = ['mysql', 'postgres', 'sqlserver']) {
  try {
    await docker(['info']);
  } catch {
    throw new Error('Docker is not available. Start Docker Desktop and retry.');
  }

  const results = [];
  for (const key of engines) {
    results.push(await ensureEngine(key));
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  let engines = ['mysql', 'postgres', 'sqlserver'];
  if (args.includes('--mysql') || args.includes('--postgres') || args.includes('--sqlserver')) {
    engines = [];
    if (args.includes('--mysql')) engines.push('mysql');
    if (args.includes('--postgres')) engines.push('postgres');
    if (args.includes('--sqlserver')) engines.push('sqlserver');
  }

  console.log('Ensuring ApiForge test databases...');
  const results = await ensureDbs(engines);
  console.log('Done:', results.map((r) => `${r.engine}${r.reused ? ' (reused)' : ''}`).join(', '));
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
