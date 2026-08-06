import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProgressRail, type WizardStepMeta } from '../components/ProgressRail';
import { detectAuth, introspect, preview as previewApi } from '../lib/api';
import {
  createInitialConfig,
  type ConnectionConfig,
  type DetectedAuthTable,
  type GenerateConfig,
  type GeneratePreview,
  type TableMeta,
} from '../types';
import { AuthStep } from '../wizard/AuthStep';
import { ColumnsStep } from '../wizard/ColumnsStep';
import { ConnectStep } from '../wizard/ConnectStep';
import { GenerateStep } from '../wizard/GenerateStep';
import { PreviewStep } from '../wizard/PreviewStep';
import { SecurityStep } from '../wizard/SecurityStep';
import { StackStep } from '../wizard/StackStep';
import { TablesStep } from '../wizard/TablesStep';

const STEPS: WizardStepMeta[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'tables', label: 'Tables' },
  { id: 'columns', label: 'Columns' },
  { id: 'auth', label: 'Auth' },
  { id: 'security', label: 'Security' },
  { id: 'stack', label: 'Stack' },
  { id: 'preview', label: 'Preview' },
  { id: 'generate', label: 'Generate' },
];

function prepareTables(tables: TableMeta[]): TableMeta[] {
  return tables.map((t) => ({
    ...t,
    selected: t.selected ?? true,
    columns: t.columns.map((c) => ({
      ...c,
      selected: c.selected ?? true,
      sensitive:
        c.sensitive ??
        /password|secret|token|hash|ssn|salt/i.test(c.name),
    })),
  }));
}

export function Wizard() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<GenerateConfig>(createInitialConfig);
  const [detectedAuth, setDetectedAuth] = useState<DetectedAuthTable[]>([]);
  const [preview, setPreview] = useState<GeneratePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = (index: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, index)));

  const patchConfig = useCallback((partial: Partial<GenerateConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const setConnection = useCallback((connection: ConnectionConfig) => {
    setConfig((prev) => ({ ...prev, connection }));
  }, []);

  const setTables = useCallback((tables: TableMeta[]) => {
    setConfig((prev) => ({ ...prev, tables }));
  }, []);

  async function continueFromConnect() {
    setBusy(true);
    setError(null);
    try {
      const result = await introspect(config.connection);
      const tables = prepareTables(result.tables);
      setConfig((prev) => ({ ...prev, tables }));

      try {
        const authResult = await detectAuth({ tables });
        setDetectedAuth(authResult.detected);
        if (authResult.detected[0]) {
          const t = authResult.detected[0];
          setConfig((prev) => ({
            ...prev,
            tables,
            auth: {
              ...prev.auth,
              enabled: true,
              mode: 'existing',
              tableSchema: t.schema,
              tableName: t.table,
              usernameColumn: t.usernameColumn,
              passwordColumn: t.passwordColumn,
              idColumn: t.idColumn,
            },
          }));
        }
      } catch {
        setDetectedAuth([]);
      }

      go(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Introspection failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const payload: GenerateConfig = {
        ...config,
        tables: config.tables.filter((t) => t.selected),
      };
      const result = await previewApi(payload);
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function goToPreview() {
    go(6);
    await loadPreview();
  }

  const selectedTables = config.tables.filter((t) => t.selected);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:py-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--cyan)]">
          Wizard
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Forge an API
        </h1>
      </div>

      {error && (
        <p className="mb-6 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-6">
            <div className="mb-3 hidden lg:block">
              <ProgressRail steps={STEPS} current={step} onSelect={go} />
            </div>
            <div className="lg:hidden">
              <ProgressRail
                steps={STEPS}
                current={step}
                onSelect={go}
                orientation="horizontal"
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <ConnectStep
                  config={config}
                  onChange={setConnection}
                  onContinue={continueFromConnect}
                  loading={busy}
                />
              )}
              {step === 1 && (
                <TablesStep
                  tables={config.tables}
                  onChange={setTables}
                  onBack={() => go(0)}
                  onNext={() => go(2)}
                />
              )}
              {step === 2 && (
                <ColumnsStep
                  tables={config.tables}
                  onChange={setTables}
                  onBack={() => go(1)}
                  onNext={() => go(3)}
                />
              )}
              {step === 3 && (
                <AuthStep
                  auth={config.auth}
                  detected={detectedAuth}
                  onChange={(auth) => patchConfig({ auth })}
                  onBack={() => go(2)}
                  onNext={() => go(4)}
                />
              )}
              {step === 4 && (
                <SecurityStep
                  security={config.security}
                  onChange={(security) => patchConfig({ security })}
                  onBack={() => go(3)}
                  onNext={() => go(5)}
                />
              )}
              {step === 5 && (
                <StackStep
                  config={config}
                  onChange={patchConfig}
                  onBack={() => go(4)}
                  onNext={() => void goToPreview()}
                />
              )}
              {step === 6 && (
                <PreviewStep
                  preview={preview}
                  loading={previewLoading}
                  error={previewError}
                  onBack={() => go(5)}
                  onNext={() => go(7)}
                  onRetry={() => void loadPreview()}
                />
              )}
              {step === 7 && (
                <GenerateStep
                  config={{
                    ...config,
                    tables: selectedTables,
                  }}
                  onBack={() => go(6)}
                  onReset={() => {
                    setConfig(createInitialConfig());
                    setDetectedAuth([]);
                    setPreview(null);
                    setPreviewError(null);
                    setError(null);
                    go(0);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
