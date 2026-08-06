import { Plus, Table2 } from 'lucide-react';
import type { TableMeta } from '../../types';

interface SchemaPaletteProps {
  available: TableMeta[];
  filter: string;
  onFilter: (value: string) => void;
  onDragStart: (event: React.DragEvent, table: TableMeta) => void;
  onCreateTable: () => void;
}

export function SchemaPalette({
  available,
  filter,
  onFilter,
  onDragStart,
  onCreateTable,
}: SchemaPaletteProps) {
  const q = filter.trim().toLowerCase();
  const filtered = available.filter((t) => {
    if (!q) return true;
    return t.name.toLowerCase().includes(q) || t.schema.toLowerCase().includes(q);
  });

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]/80">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--cyan)]">
          Componentes
        </p>
        <p className="mt-1 text-xs leading-snug text-[var(--muted)]">
          Arraste tabelas para o canvas ou crie uma nova.
        </p>
        <input
          className="field mt-3 w-full text-xs"
          placeholder="Filtrar…"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <button
          type="button"
          onClick={onCreateTable}
          className="mb-2 flex w-full items-center gap-2 rounded-md border border-dashed border-[var(--cyan)]/40 bg-[var(--cyan-glow)] px-2.5 py-2 text-left text-xs font-medium text-[var(--cyan)] transition-colors hover:border-[var(--cyan)]"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New table
        </button>

        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[var(--muted)]">
            {available.length === 0
              ? 'Todas as tabelas estão no canvas.'
              : 'Nenhuma tabela neste filtro.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((table) => {
              const key = `${table.schema}.${table.name}`;
              const schema =
                table.schema && !['public', 'dbo', 'main'].includes(table.schema)
                  ? `${table.schema}.`
                  : '';
              return (
                <li key={key}>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, table)}
                    className="flex cursor-grab items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 active:cursor-grabbing"
                  >
                    <Table2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        <span className="text-[var(--muted)]">{schema}</span>
                        {table.name}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {table.type} · {table.columns.length} cols
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
