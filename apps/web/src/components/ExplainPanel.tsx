import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExplainPanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function ExplainPanel({ title, children, defaultOpen = false }: ExplainPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cyan)]">
          {title}
        </span>
        <ChevronDown
          className={[
            'h-4 w-4 shrink-0 text-[var(--muted)] transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--border)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
          {children}
        </div>
      )}
    </div>
  );
}
