import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, Loader2, Sparkles } from 'lucide-react';
import { StepNav } from '../components/StepNav';
import { downloadBlob, generate } from '../lib/api';
import type { GenerateConfig } from '../types';

interface GenerateStepProps {
  config: GenerateConfig;
  onBack: () => void;
  onReset: () => void;
}

export function GenerateStep({ config, onBack, onReset }: GenerateStepProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    try {
      const blob = await generate(config);
      const safe = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadBlob(blob, `${safe}.zip`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[320px] flex-col items-start justify-center"
      >
        <CheckCircle2 className="h-12 w-12 text-[var(--success)]" strokeWidth={1.5} />
        <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">Forged.</h2>
        <p className="mt-3 max-w-md text-[var(--muted)] leading-relaxed">
          <span className="text-[var(--fg)]">{config.projectName}.zip</span> downloaded.
          A copy is also written under the monorepo{' '}
          <span className="mono text-[var(--cyan-dim)]">output/{config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}</span>{' '}
          folder on the server.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={() => void onGenerate()}>
            <Download className="h-4 w-4" />
            Download again
          </button>
          <Link to="/projects" className="btn btn-ghost">
            View projects
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Forge another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Generate</h2>
      <p className="mt-2 text-[var(--muted)]">
        Build <span className="text-[var(--fg)]">{config.projectName}</span> as a zip and write it
        locally.
      </p>

      <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 px-5 py-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-[var(--cyan)]" />
          <div>
            <p className="font-medium">Ready to forge</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Stack <span className="mono text-[var(--cyan-dim)]">{config.stack}</span>
              {' · '}
              {config.tables.filter((t) => t.selected).length} tables
              {' · '}
              port {config.port}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary mt-6"
          disabled={busy}
          onClick={() => void onGenerate()}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Generate & download zip
            </>
          )}
        </button>

        {error && (
          <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>
        )}
      </div>

      <StepNav onBack={onBack} />
    </div>
  );
}
