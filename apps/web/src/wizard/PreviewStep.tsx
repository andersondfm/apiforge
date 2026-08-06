import { useEffect, useMemo, useState } from 'react';
import { CodePanel } from '../components/CodePanel';
import { MethodBadge } from '../components/MethodBadge';
import { StepNav } from '../components/StepNav';
import type { GeneratePreview } from '../types';
import { FileCode2, Loader2 } from 'lucide-react';

interface PreviewStepProps {
  preview: GeneratePreview | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
  onRetry: () => void;
}

export function PreviewStep({
  preview,
  loading,
  error,
  onBack,
  onNext,
  onRetry,
}: PreviewStepProps) {
  const tree = useMemo(() => {
    if (!preview) return [];
    return preview.tree?.length
      ? preview.tree
      : preview.files.map((f) => f.path).sort();
  }, [preview]);

  const [selectedPath, setSelectedPath] = useState<string>('');

  useEffect(() => {
    if (tree.length && !tree.includes(selectedPath)) {
      setSelectedPath(tree[0] ?? '');
    }
  }, [tree, selectedPath]);

  const content =
    preview?.files.find((f) => f.path === selectedPath)?.content ?? '';

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--cyan)]" />
        <p className="text-sm">Forging preview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Preview</h2>
        <p className="mt-4 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry preview
          </button>
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Preview</h2>
      <p className="mt-2 text-[var(--muted)]">
        {preview.files.length} files · {preview.endpoints.length} endpoints
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
        <ul className="scrollbar-thin max-h-[360px] overflow-y-auto border-y border-[var(--border)]/70 py-1 lg:max-h-[480px]">
          {tree.map((path) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => setSelectedPath(path)}
                className={[
                  'flex w-full items-start gap-2 px-2 py-1.5 text-left text-xs transition-colors',
                  selectedPath === path
                    ? 'bg-[var(--cyan-glow)] text-[var(--cyan)]'
                    : 'text-[var(--muted)] hover:text-[var(--fg)]',
                ].join(' ')}
              >
                <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="mono break-all">{path}</span>
              </button>
            </li>
          ))}
        </ul>
        <CodePanel path={selectedPath} content={content} />
      </div>

      {preview.endpoints.length > 0 && (
        <div className="mt-8">
          <p className="label">Endpoints</p>
          <ul className="mt-2 max-h-56 space-y-0 overflow-y-auto border-y border-[var(--border)]/70 scrollbar-thin">
            {preview.endpoints.map((ep) => (
              <li
                key={`${ep.method}-${ep.path}`}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--border)]/50 py-2.5 last:border-0"
              >
                <MethodBadge method={ep.method} />
                <span className="mono text-sm">{ep.path}</span>
                <span className="text-xs text-[var(--muted)]">{ep.description}</span>
                {ep.authRequired && (
                  <span className="text-[0.65rem] uppercase tracking-wider text-[var(--warning)]">
                    auth
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Generate" />
    </div>
  );
}
