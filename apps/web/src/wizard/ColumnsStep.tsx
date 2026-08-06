import { useMemo, useState } from 'react';
import { StepNav } from '../components/StepNav';
import type { TableMeta } from '../types';

interface ColumnsStepProps {
  tables: TableMeta[];
  onChange: (tables: TableMeta[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ColumnsStep({ tables, onChange, onBack, onNext }: ColumnsStepProps) {
  const selected = useMemo(() => tables.filter((t) => t.selected), [tables]);
  const [activeKey, setActiveKey] = useState(
    selected[0] ? `${selected[0].schema}.${selected[0].name}` : '',
  );

  const active =
    selected.find((t) => `${t.schema}.${t.name}` === activeKey) ?? selected[0] ?? null;

  function updateColumn(
    schema: string,
    tableName: string,
    columnName: string,
    patch: { selected?: boolean; sensitive?: boolean },
  ) {
    onChange(
      tables.map((t) => {
        if (t.schema !== schema || t.name !== tableName) return t;
        return {
          ...t,
          columns: t.columns.map((c) =>
            c.name === columnName ? { ...c, ...patch } : c,
          ),
        };
      }),
    );
  }

  if (selected.length === 0) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Columns</h2>
        <p className="mt-2 text-[var(--muted)]">Select at least one table first.</p>
        <StepNav onBack={onBack} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Columns</h2>
      <p className="mt-2 text-[var(--muted)]">
        Toggle which columns ship. Mark secrets as sensitive.
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <ul className="scrollbar-thin flex max-h-48 shrink-0 gap-2 overflow-x-auto lg:max-h-[420px] lg:w-48 lg:flex-col lg:overflow-y-auto">
          {selected.map((t) => {
            const key = `${t.schema}.${t.name}`;
            const isActive = active && `${active.schema}.${active.name}` === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={[
                    'whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors lg:w-full',
                    isActive
                      ? 'bg-[var(--cyan-glow)] text-[var(--cyan)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]',
                  ].join(' ')}
                >
                  {t.name}
                </button>
              </li>
            );
          })}
        </ul>

        {active && (
          <ul className="scrollbar-thin max-h-[420px] flex-1 overflow-y-auto border-y border-[var(--border)]/70">
            {active.columns.map((col) => (
              <li
                key={col.name}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--border)]/50 py-3 last:border-0"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={col.selected !== false}
                    onChange={(e) =>
                      updateColumn(active.schema, active.name, col.name, {
                        selected: e.target.checked,
                      })
                    }
                    className="accent-[var(--cyan)]"
                  />
                  <span className="min-w-0">
                    <span className="mono block text-sm">{col.name}</span>
                    <span className="text-xs text-[var(--muted)]">{col.dataType}</span>
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {col.isPrimaryKey && (
                    <span className="rounded border border-[var(--cyan)]/35 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--cyan)]">
                      PK
                    </span>
                  )}
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--muted)]">
                    <input
                      type="checkbox"
                      checked={Boolean(col.sensitive)}
                      onChange={(e) =>
                        updateColumn(active.schema, active.name, col.name, {
                          sensitive: e.target.checked,
                        })
                      }
                      className="accent-[var(--warning)]"
                    />
                    Sensitive
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
