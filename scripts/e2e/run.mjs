#!/usr/bin/env node
/**
 * ApiForge E2E: generate × stack × engine → install → start → CRUD /products
 *
 * Env:
 *   E2E_STACKS=node-express,node-fastify
 *   E2E_ENGINES=mysql,sqlite
 *   E2E_SKIP_DOTNET=1
 *   E2E_KEEP=1          keep work dir on success
 *   E2E_WORK_DIR=path   override work root
 */
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { generateProject } from '@apiforge/codegen';
import { ensureDbs } from '../ensure-dbs.mjs';
import { runProductsCrud, waitForHealth } from './crud.mjs';
import {
  STACKS,
  ENGINES,
  buildConfig,
  isNodeStack,
  projectDirName,
  defaultPort,
  resolveSqlitePath,
} from './fixture.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SQLITE_SEED = path.join(REPO_ROOT, 'scripts/sqlite/seed.sql');

function parseList(envVal, fallback) {
  if (!envVal || !envVal.trim()) return [...fallback];
  return envVal
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function log(msg) {
  console.log(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function commandExists(cmd) {
  try {
    await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [cmd]);
    return true;
  } catch {
    return false;
  }
}

function writeGenerated(dir, files) {
  for (const f of files) {
    const full = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, f.content, 'utf8');
  }
}

function writeEnv(dir, port, extra = {}) {
  const example = path.join(dir, '.env.example');
  const map = {};
  if (fs.existsSync(example)) {
    for (const line of fs.readFileSync(example, 'utf8').split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i > 0) map[line.slice(0, i)] = line.slice(i + 1);
    }
  }
  map.PORT = String(port);
  Object.assign(map, extra);
  const body = Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync(path.join(dir, '.env'), `${body}\n`, 'utf8');
}

function patchNetUrls(dir, port) {
  const settingsPath = path.join(dir, 'appsettings.json');
  if (!fs.existsSync(settingsPath)) return;
  const json = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  json.Urls = `http://127.0.0.1:${port}`;
  if (json.Security) {
    json.Security.RateLimitEnabled = false;
    json.Security.ApiKeyEnabled = false;
    json.Security.CorsMode = 'all';
  }
  fs.writeFileSync(settingsPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

async function seedSqliteAsync(dbPath) {
  const mod = await import('node:sqlite');
  const DatabaseSync = mod.DatabaseSync;
  if (!DatabaseSync) {
    throw new Error('node:sqlite DatabaseSync is required (Node.js >= 22.5)');
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const sql = fs.readFileSync(SQLITE_SEED, 'utf8');
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();
}

function runProcess(command, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      shell: opts.shell ?? process.platform === 'win32',
      stdio: opts.stdio ?? 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function startProcess(command, args, opts) {
  const child = spawn(command, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    shell: opts.shell ?? process.platform === 'win32',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  const push = (buf) => {
    logs.push(buf.toString());
  };
  child.stdout?.on('data', push);
  child.stderr?.on('data', push);
  child.getLogs = () => logs.join('');
  return child;
}

async function killProcess(child) {
  if (!child || child.killed || child.exitCode != null) return;
  const pid = child.pid;
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      await execFileAsync('taskkill', ['/pid', String(pid), '/T', '/F']).catch(() => {});
    } else {
      child.kill('SIGTERM');
      await sleep(500);
      if (child.exitCode == null) {
        try {
          child.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function findCsproj(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csproj'));
  if (!files.length) throw new Error(`No .csproj in ${dir}`);
  return path.join(dir, files[0]);
}

async function installAndStart({ stack, dir, port }) {
  if (isNodeStack(stack)) {
    await runProcess('npm', ['install', '--no-fund', '--no-audit'], { cwd: dir });
    return startProcess('npx', ['tsx', 'src/index.ts'], {
      cwd: dir,
      env: { PORT: String(port), NODE_ENV: 'development' },
    });
  }

  const csproj = findCsproj(dir);
  await runProcess('dotnet', ['restore', csproj], { cwd: dir });
  return startProcess(
    'dotnet',
    ['run', '--project', csproj, '--no-restore', '--urls', `http://127.0.0.1:${port}`],
    { cwd: dir, env: { ASPNETCORE_ENVIRONMENT: 'Development' } },
  );
}

async function runCell({ stack, engine, index, workRoot }) {
  const name = projectDirName(stack, engine);
  const dir = path.join(workRoot, name);
  const port = defaultPort(stack, index);
  const baseUrl = `http://127.0.0.1:${port}`;
  const sqlitePath = resolveSqlitePath(workRoot, stack);

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  if (engine === 'sqlite') {
    await seedSqliteAsync(sqlitePath);
  }

  const config = buildConfig({
    stack,
    engine,
    projectName: name,
    port,
    sqlitePath: engine === 'sqlite' ? sqlitePath : undefined,
  });

  const preview = generateProject(config);
  writeGenerated(dir, preview.files);

  if (isNodeStack(stack)) {
    writeEnv(dir, port, engine === 'sqlite' ? { DATABASE_URL: sqlitePath } : {});
  } else {
    patchNetUrls(dir, port);
    if (engine === 'sqlite') {
      const settingsPath = path.join(dir, 'appsettings.json');
      const json = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      json.ConnectionStrings = json.ConnectionStrings || {};
      json.ConnectionStrings.Default = `Data Source=${sqlitePath.replace(/\\/g, '/')}`;
      fs.writeFileSync(settingsPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    }
  }

  let child;
  try {
    child = await installAndStart({ stack, dir, port });
    await waitForHealth(baseUrl, 90_000);
    await runProductsCrud(baseUrl);
  } catch (err) {
    const logs = child?.getLogs?.() ?? '';
    if (logs) {
      err.message = `${err.message}\n--- server logs ---\n${logs.slice(-4000)}`;
    }
    throw err;
  } finally {
    await killProcess(child);
    await sleep(300);
  }
}

async function main() {
  let stacks = parseList(process.env.E2E_STACKS, STACKS);
  const engines = parseList(process.env.E2E_ENGINES, ENGINES);

  if (process.env.E2E_SKIP_DOTNET === '1') {
    stacks = stacks.filter((s) => isNodeStack(s));
  }

  const needsDocker = engines.some((e) => e !== 'sqlite');
  if (needsDocker) {
    const ensureKeys = [
      ...new Set(
        engines
          .filter((e) => e !== 'sqlite')
          .map((e) => (e === 'postgresql' ? 'postgres' : e)),
      ),
    ];
    log('Ensuring Docker databases (reuse if healthy)...');
    await ensureDbs(ensureKeys);
  }

  if (stacks.some((s) => !isNodeStack(s))) {
    const hasDotnet = await commandExists('dotnet');
    if (!hasDotnet) {
      throw new Error(
        '.NET SDK not found (dotnet). Install .NET 10 SDK or set E2E_SKIP_DOTNET=1 / E2E_STACKS=node-express,node-fastify',
      );
    }
  }

  const workRoot =
    process.env.E2E_WORK_DIR || path.join(os.tmpdir(), `apiforge-e2e-${Date.now()}`);
  fs.mkdirSync(workRoot, { recursive: true });
  log(`Work dir: ${workRoot}`);

  const matrix = [];
  for (const stack of stacks) {
    for (const engine of engines) {
      matrix.push({ stack, engine });
    }
  }

  const results = [];
  let index = 0;
  for (const cell of matrix) {
    const label = `${cell.stack} × ${cell.engine}`;
    log(`\n=== [${index + 1}/${matrix.length}] ${label} ===`);
    const started = Date.now();
    try {
      await runCell({ ...cell, index, workRoot });
      const ms = Date.now() - started;
      log(`OK ${label} (${ms}ms)`);
      results.push({ ...cell, ok: true, ms });
    } catch (err) {
      const ms = Date.now() - started;
      console.error(`FAIL ${label}: ${err.message}`);
      results.push({ ...cell, ok: false, ms, error: err.message });
    }
    index += 1;
  }

  const reportPath = path.join(workRoot, 'report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  const lastReport = path.join(__dirname, 'last-report.json');
  fs.writeFileSync(lastReport, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  log(`\nReport: ${reportPath}`);

  const failed = results.filter((r) => !r.ok);
  log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  for (const r of results) {
    log(
      `  ${r.ok ? 'PASS' : 'FAIL'}  ${r.stack} × ${r.engine}${r.ok ? '' : ` — ${r.error?.split('\n')[0]}`}`,
    );
  }

  if (process.env.E2E_KEEP !== '1' && failed.length === 0) {
    fs.rmSync(workRoot, { recursive: true, force: true });
  }

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
