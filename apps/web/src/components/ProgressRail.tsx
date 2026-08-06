import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface WizardStepMeta {
  id: string;
  label: string;
}

interface ProgressRailProps {
  steps: WizardStepMeta[];
  current: number;
  onSelect?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function ProgressRail({
  steps,
  current,
  onSelect,
  orientation = 'vertical',
}: ProgressRailProps) {
  const isVertical = orientation === 'vertical';

  return (
    <ol
      className={
        isVertical
          ? 'flex flex-col gap-1'
          : 'flex flex-row gap-1 overflow-x-auto pb-1 scrollbar-thin'
      }
      aria-label="Wizard progress"
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = onSelect && index <= current;

        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(index)}
              className={[
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isVertical ? '' : 'min-w-[7.5rem]',
                active
                  ? 'bg-[var(--cyan-glow)] text-[var(--fg)]'
                  : done
                    ? 'text-[var(--fg)] hover:bg-[var(--bg-soft)]'
                    : 'text-[var(--muted)]',
                clickable ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              <span
                className={[
                  'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  active
                    ? 'border-[var(--cyan)] bg-[var(--cyan)] text-[#061018]'
                    : done
                      ? 'border-[var(--cyan-dim)] bg-transparent text-[var(--cyan)]'
                      : 'border-[var(--border)] bg-transparent text-[var(--muted)]',
                ].join(' ')}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
                {active && (
                  <motion.span
                    layoutId="rail-pulse"
                    className="absolute inset-0 rounded-full ring-2 ring-[var(--cyan)]/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={[
                    'block truncate text-[0.7rem] uppercase tracking-[0.12em]',
                    active ? 'text-[var(--cyan)]' : 'text-[var(--muted)]',
                  ].join(' ')}
                >
                  Step {index + 1}
                </span>
                <span className="block truncate text-sm font-medium">{step.label}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
