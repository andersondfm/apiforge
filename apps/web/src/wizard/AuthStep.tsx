import { StepNav } from '../components/StepNav';
import { ExplainPanel } from '../components/ExplainPanel';
import type { AuthConfig, DetectedAuthTable } from '../types';

interface AuthStepProps {
  auth: AuthConfig;
  detected: DetectedAuthTable[];
  onChange: (auth: AuthConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AuthStep({ auth, detected, onChange, onBack, onNext }: AuthStepProps) {
  function pickMode(mode: AuthConfig['mode'], table?: DetectedAuthTable) {
    if (mode === 'none') {
      onChange({ ...auth, enabled: false, mode: 'none' });
      return;
    }
    if (mode === 'create') {
      onChange({
        ...auth,
        enabled: true,
        mode: 'create',
        tableName: 'users',
        usernameColumn: 'username',
        passwordColumn: 'password',
        idColumn: 'id',
      });
      return;
    }
    if (table) {
      onChange({
        ...auth,
        enabled: true,
        mode: 'existing',
        tableSchema: table.schema,
        tableName: table.table,
        usernameColumn: table.usernameColumn,
        passwordColumn: table.passwordColumn,
        idColumn: table.idColumn,
      });
    }
  }

  const selectedExistingKey =
    auth.mode === 'existing' && auth.tableName
      ? `${auth.tableSchema ?? ''}.${auth.tableName}`
      : null;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Auth</h2>
      <p className="mt-2 text-[var(--muted)]">
        Wire JWT auth from an existing users table, create one, or skip.
      </p>

      <ExplainPanel title="Como funciona o JWT" defaultOpen>
        <p>
          Um <strong className="text-[var(--fg)]">JWT (JSON Web Token)</strong> é um “crachá”
          digital. Depois do login, a API devolve um token; o cliente envia{' '}
          <code className="mx-1 rounded bg-[var(--bg-soft)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--cyan)]">
            Authorization: Bearer &lt;token&gt;
          </code>{' '}
          nas próximas requests.
        </p>
        <p>
          O servidor valida a assinatura do token (com o JWT secret) e libera os endpoints
          protegidos — sem guardar sessão no banco.
        </p>
        <p>
          No Swagger, use o botão <strong className="text-[var(--fg)]">Authorize</strong> e cole o
          token recebido em{' '}
          <code className="font-mono text-[11px] text-[var(--cyan)]">/auth/login</code>.
        </p>
      </ExplainPanel>

      <div className="mt-8 space-y-3" role="radiogroup" aria-label="Auth mode">
        {detected.map((table) => {
          const key = `${table.schema}.${table.table}`;
          const selected = selectedExistingKey === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pickMode('existing', table)}
              className={[
                'flex w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors',
                selected
                  ? 'border-[var(--cyan)] bg-[var(--cyan-glow)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]',
              ].join(' ')}
            >
              <span className="font-medium">
                Use {table.schema}.{table.table}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {table.usernameColumn} / {table.passwordColumn} · confidence {table.confidence}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          role="radio"
          aria-checked={auth.mode === 'create' && auth.enabled}
          onClick={() => pickMode('create')}
          className={[
            'flex w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors',
            auth.mode === 'create' && auth.enabled
              ? 'border-[var(--cyan)] bg-[var(--cyan-glow)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          ].join(' ')}
        >
          <span className="font-medium">Create users table</span>
          <span className="text-xs text-[var(--muted)]">
            Scaffold a users model with username + password hash
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={auth.mode === 'none' || !auth.enabled}
          onClick={() => pickMode('none')}
          className={[
            'flex w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors',
            auth.mode === 'none' || !auth.enabled
              ? 'border-[var(--cyan)] bg-[var(--cyan-glow)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          ].join(' ')}
        >
          <span className="font-medium">No auth</span>
          <span className="text-xs text-[var(--muted)]">Generate open CRUD endpoints</span>
        </button>
      </div>

      {auth.enabled && auth.mode !== 'none' && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="jwt-expires">
              JWT expires in
            </label>
            <input
              id="jwt-expires"
              className="field"
              value={auth.jwtExpiresIn ?? '24h'}
              onChange={(e) => onChange({ ...auth, jwtExpiresIn: e.target.value })}
              placeholder="24h"
            />
          </div>
          <div>
            <label className="label" htmlFor="jwt-secret">
              JWT secret (optional)
            </label>
            <input
              id="jwt-secret"
              className="field mono"
              value={auth.jwtSecret ?? ''}
              onChange={(e) => onChange({ ...auth, jwtSecret: e.target.value || undefined })}
              placeholder="Generated if empty"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={Boolean(auth.includeRegister)}
              onChange={(e) => onChange({ ...auth, includeRegister: e.target.checked })}
              className="accent-[var(--cyan)]"
            />
            Include register endpoint
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={Boolean(auth.includeRefreshToken)}
              onChange={(e) => onChange({ ...auth, includeRefreshToken: e.target.checked })}
              className="accent-[var(--cyan)]"
            />
            Include refresh token
          </label>
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
