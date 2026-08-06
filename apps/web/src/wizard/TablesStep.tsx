import { useMemo, useState } from 'react';
import { StepNav } from '../components/StepNav';
import type { TableMeta } from '../types';

interface TablesStepProps {
  tables: TableMeta[];
  onChange: (tables: TableMeta[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TablesStep({ tables, onChange, onBack, onNext }: TablesStepProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.schema.toLowerCase().includes(q) ||
        `${t.schema}.${t.name}`.toLowerCase().includes(q),
    );
  }, [tables, query]);

  const selectedCount = tables.filter((t) => t.selected).length;

  function toggle(schema: string, name: string) {
    onChange(
      tables.map((t) =>
        t.schema === schema && t.name === name ? { ...t, selected: !t.selected } : t,
      ),
    );
  }

  function selectAll(value: boolean) {
    const keys = new Set(filtered.map((t) => `${t.schema}.${t.name}`));
    onChange(
      tables.map((t) =>
        keys.has(`${t.schema}.${t.name}`) ? { ...t, selected: value } : t,
      ),
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Tables</h2>
      <p className="mt-2 text-[var(--muted)]">
        Select the tables to expose. {selectedCount} of {tables.length} selected.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          placeholder="Filter tables…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn btn-ghost py-2 text-sm" onClick={() => selectAll(true)}>
          Select all
        </button>
        <button type="button" className="btn btn-ghost py-2 text-sm" onClick={() => selectAll(false)}>
          None
        </button>
      </div>

      <ul className="scrollbar-thin mt-6 max-h-[420px] space-y-0 overflow-y-auto border-y border-[var(--border)]/70">
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-[var(--muted)]">No tables match.</li>
        )}
        {filtered.map((table) => {
          const id = `${table.schema}.${table.name}`;
          return (
            <li key={id} className="border-b border-[var(--border)]/50 last:border-0">
              <label className="flex cursor-pointer items-center gap-3 px-1 py-3 hover:bg-[var(--bg-soft)]/50">
                <input
                  type="checkbox"
                  checked={Boolean(table.selected)}
                  onChange={() => toggle(table.schema, table.name)}
                  className="accent-[var(--cyan)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {table.schema !== 'public' && table.schema !== 'dbo' ? (
                      <>
                        <span className="text-[var(--muted)]">{table.schema}.</span>
                        {table.name}
                      </>
                    ) : (
                      table.name
                    )}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {table.columns.length} columns
                    {table.type === 'view' ? ' · view' : ''}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={selectedCount === 0} />
    </div>
  );
}
