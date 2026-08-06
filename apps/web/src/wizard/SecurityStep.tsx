import { StepNav } from '../components/StepNav';
import { ExplainPanel } from '../components/ExplainPanel';
import type { CorsMode, SecurityConfig } from '../types';

interface SecurityStepProps {
  security: SecurityConfig;
  onChange: (security: SecurityConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

const CORS_OPTIONS: { id: CorsMode; label: string; hint: string }[] = [
  { id: 'all', label: 'Allow all', hint: 'Reflect any origin (dev-friendly)' },
  { id: 'origins', label: 'Allowlist', hint: 'Only listed origins' },
  { id: 'disabled', label: 'Disabled', hint: 'No CORS middleware' },
];

export function SecurityStep({ security, onChange, onBack, onNext }: SecurityStepProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Security</h2>
      <p className="mt-2 text-[var(--muted)]">
        CORS, IP allowlists, rate limits, and headers — dialed before codegen.
      </p>

      <ExplainPanel title="Para que serve cada controle" defaultOpen>
        <p>
          <strong className="text-[var(--fg)]">CORS</strong> — quem (qual site/app) pode chamar a
          API no browser. Em produção, preferir allowlist com seus frontends.
        </p>
        <p>
          <strong className="text-[var(--fg)]">Rate limit</strong> — limita requests por minuto para
          frear abuso e bots.
        </p>
        <p>
          <strong className="text-[var(--fg)]">API key</strong> — chave estática no header (além ou
          no lugar do JWT) para clientes server-to-server.
        </p>
        <p>
          <strong className="text-[var(--fg)]">IP allowlist</strong> — só IPs listados passam;
          vazio = todos.
        </p>
        <p>
          <strong className="text-[var(--fg)]">Helmet</strong> — headers HTTP que reduzem XSS,
          clickjacking e vazamento de metadados.
        </p>
      </ExplainPanel>

      <div className="mt-8 space-y-8">
        <div>
          <p className="label">CORS mode</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="CORS mode">
            {CORS_OPTIONS.map((opt) => {
              const selected = security.corsMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ ...security, corsMode: opt.id })}
                  className={[
                    'rounded-lg border px-3 py-3 text-left transition-colors',
                    selected
                      ? 'border-[var(--cyan)] bg-[var(--cyan-glow)]'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                  ].join(' ')}
                >
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {security.corsMode === 'origins' && (
          <div>
            <label className="label" htmlFor="origins">
              Allowed origins (one per line)
            </label>
            <textarea
              id="origins"
              className="field min-h-[100px] mono"
              value={security.corsOrigins.join('\n')}
              onChange={(e) =>
                onChange({
                  ...security,
                  corsOrigins: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="ips">
            Allowed IPs (optional, one per line)
          </label>
          <textarea
            id="ips"
            className="field min-h-[80px] mono"
            value={security.allowedIps.join('\n')}
            onChange={(e) =>
              onChange({
                ...security,
                allowedIps: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="127.0.0.1"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={security.rateLimitEnabled}
              onChange={(e) => onChange({ ...security, rateLimitEnabled: e.target.checked })}
              className="accent-[var(--cyan)]"
            />
            Rate limiting
          </label>
          {security.rateLimitEnabled && (
            <div>
              <label className="label" htmlFor="rate">
                Requests / minute
              </label>
              <input
                id="rate"
                type="number"
                min={1}
                className="field"
                value={security.rateLimitPerMinute}
                onChange={(e) =>
                  onChange({
                    ...security,
                    rateLimitPerMinute: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={security.apiKeyEnabled}
              onChange={(e) => onChange({ ...security, apiKeyEnabled: e.target.checked })}
              className="accent-[var(--cyan)]"
            />
            Require API key
          </label>
          {security.apiKeyEnabled && (
            <div>
              <label className="label" htmlFor="api-key-header">
                API key header
              </label>
              <input
                id="api-key-header"
                className="field mono"
                value={security.apiKeyHeader}
                onChange={(e) => onChange({ ...security, apiKeyHeader: e.target.value })}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={security.helmetEnabled}
              onChange={(e) => onChange({ ...security, helmetEnabled: e.target.checked })}
              className="accent-[var(--cyan)]"
            />
            Helmet / security headers
          </label>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
