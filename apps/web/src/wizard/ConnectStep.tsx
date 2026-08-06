import { useState } from 'react';
import { EnginePicker } from '../components/EnginePicker';
import { StepNav } from '../components/StepNav';
import { testConnection } from '../lib/api';
import type { ConnectionConfig, DbEngine, GenerateConfig } from '../types';
import { defaultPort } from '../types';
import { CheckCircle2, CircleAlert } from 'lucide-react';

interface ConnectStepProps {
  config: GenerateConfig;
  onChange: (connection: ConnectionConfig) => void;
  onContinue: () => Promise<void>;
  loading: boolean;
}

export function ConnectStep({ config, onChange, onContinue, loading }: ConnectStepProps) {
  const conn = config.connection;
  const [useString, setUseString] = useState(Boolean(conn.connectionString));
  const [testMsg, setTestMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  function setEngine(engine: DbEngine) {
    onChange({
      ...conn,
      engine,
      port: defaultPort(engine) || undefined,
      filePath: engine === 'sqlite' ? conn.filePath || '' : undefined,
    });
    setTestMsg(null);
  }

  function patch(partial: Partial<ConnectionConfig>) {
    onChange({ ...conn, ...partial });
    setTestMsg(null);
  }

  async function onTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const result = await testConnection(conn);
      setTestMsg(result);
    } catch (err) {
      setTestMsg({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  }

  const canContinue =
    conn.engine === 'sqlite'
      ? Boolean(conn.filePath || conn.connectionString)
      : useString
        ? Boolean(conn.connectionString)
        : Boolean(conn.host && conn.database);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Connect</h2>
      <p className="mt-2 text-[var(--muted)]">
        Choose an engine and credentials. Nothing is written until you generate.
      </p>

      <div className="mt-8 space-y-6">
        <EnginePicker value={conn.engine} onChange={setEngine} />

        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={useString}
            onChange={(e) => {
              setUseString(e.target.checked);
              if (!e.target.checked) patch({ connectionString: undefined });
            }}
            className="accent-[var(--cyan)]"
          />
          Use connection string
        </label>

        {useString ? (
          <div>
            <label className="label" htmlFor="conn-string">
              Connection string
            </label>
            <input
              id="conn-string"
              className="field mono"
              value={conn.connectionString ?? ''}
              onChange={(e) => patch({ connectionString: e.target.value })}
              placeholder="postgresql://user:pass@localhost:5432/db"
            />
          </div>
        ) : conn.engine === 'sqlite' ? (
          <div>
            <label className="label" htmlFor="file-path">
              Database file path
            </label>
            <input
              id="file-path"
              className="field mono"
              value={conn.filePath ?? ''}
              onChange={(e) => patch({ filePath: e.target.value })}
              placeholder="C:\data\app.db"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="host">
                Host
              </label>
              <input
                id="host"
                className="field"
                value={conn.host ?? ''}
                onChange={(e) => patch({ host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="label" htmlFor="port">
                Port
              </label>
              <input
                id="port"
                type="number"
                className="field"
                value={conn.port ?? ''}
                onChange={(e) =>
                  patch({ port: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="database">
                Database
              </label>
              <input
                id="database"
                className="field"
                value={conn.database ?? ''}
                onChange={(e) => patch({ database: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="field"
                value={conn.username ?? ''}
                onChange={(e) => patch({ username: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={conn.password ?? ''}
                onChange={(e) => patch({ password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)] sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(conn.ssl)}
                onChange={(e) => patch({ ssl: e.target.checked })}
                className="accent-[var(--cyan)]"
              />
              Use SSL
            </label>
          </div>
        )}

        {testMsg && (
          <div
            className={[
              'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
              testMsg.ok
                ? 'border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                : 'border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)]',
            ].join(' ')}
          >
            {testMsg.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{testMsg.message}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void onTest()}
          disabled={testing || !canContinue}
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      <StepNav
        hideBack
        onNext={() => void onContinue()}
        nextDisabled={!canContinue}
        nextLoading={loading}
        nextLabel="Continue"
      />
    </div>
  );
}
