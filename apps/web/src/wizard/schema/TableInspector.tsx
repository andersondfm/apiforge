import { Trash2 } from 'lucide-react';
import type { ColumnMeta, DbEngine, TableMeta, TableOperations } from '../../types';
import { COLUMN_TYPE_OPTIONS, defaultOperations } from '../../types';

interface TableInspectorProps {
  table: TableMeta | null;
  engine: DbEngine;
  onChange: (table: TableMeta) => void;
  onRemove: (table: TableMeta) => void;
}

const OP_ROWS: { key: keyof Required<TableOperations>; label: string; hint: string }[] = [
  { key: 'list', label: 'GET /', hint: 'Listar registros' },
  { key: 'get', label: 'GET /:id', hint: 'Buscar por id' },
  { key: 'create', label: 'POST /', hint: 'Criar' },
  { key: 'update', label: 'PUT /:id', hint: 'Atualizar' },
  { key: 'delete', label: 'DELETE /:id', hint: 'Excluir' },
];

export function TableInspector({ table, engine, onChange, onRemove }: TableInspectorProps) {
  if (!table) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg)]/80 px-4 py-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--cyan)]">
          Inspector
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Selecione um nó no canvas para editar métodos HTTP e colunas.
        </p>
      </aside>
    );
  }

  const ops = defaultOperations(table);
  const designed = table.source === 'designed';
  const types = COLUMN_TYPE_OPTIONS[engine] ?? COLUMN_TYPE_OPTIONS.sqlite;

  function patchOps(key: keyof TableOperations, value: boolean) {
    onChange({
      ...table!,
      operations: { ...ops, [key]: value },
    });
  }

  function patchColumn(index: number, patch: Partial<ColumnMeta>) {
    const columns = table!.columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...table!, columns });
  }

  function addColumn() {
    const col: ColumnMeta = {
      name: `column_${table!.columns.length + 1}`,
      dataType: types[0] ?? 'TEXT',
      isNullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
      sensitive: false,
    };
    onChange({ ...table!, columns: [...table!.columns, col] });
  }

  function removeColumn(index: number) {
    onChange({ ...table!, columns: table!.columns.filter((_, i) => i !== index) });
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg)]/80">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--cyan)]">
              Inspector
            </p>
            {designed ? (
              <input
                className="field mt-2 w-full text-sm font-semibold"
                value={table.name}
                onChange={(e) =>
                  onChange({
                    ...table,
                    name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'untitled',
                  })
                }
              />
            ) : (
              <p className="mt-1 truncate font-display text-sm font-semibold">{table.name}</p>
            )}
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {designed ? 'Designed table' : table.type}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] p-1.5 text-[var(--muted)] hover:border-[var(--danger)]/50 hover:text-[var(--danger)]"
            aria-label="Remove from canvas"
            onClick={() => onRemove(table)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <p className="label mb-2">HTTP methods</p>
          <div className="space-y-1.5">
            {OP_ROWS.map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs"
              >
                <span>
                  <span className="font-mono text-[var(--cyan)]">{label}</span>
                  <span className="ml-2 text-[var(--muted)]">{hint}</span>
                </span>
                <input
                  type="checkbox"
                  checked={ops[key]}
                  disabled={table.type === 'view' && (key === 'create' || key === 'update' || key === 'delete')}
                  onChange={(e) => patchOps(key, e.target.checked)}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">Columns</p>
            {designed && (
              <button type="button" className="text-[10px] font-medium text-[var(--cyan)]" onClick={addColumn}>
                + Add
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {table.columns.map((col, index) => (
              <li key={`${col.name}-${index}`} className="rounded-md border border-[var(--border)] p-2">
                {designed ? (
                  <div className="space-y-1.5">
                    <input
                      className="field w-full text-xs"
                      value={col.name}
                      onChange={(e) =>
                        patchColumn(index, {
                          name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'),
                        })
                      }
                    />
                    <select
                      className="field w-full text-xs"
                      value={col.dataType}
                      onChange={(e) => patchColumn(index, { dataType: e.target.value })}
                    >
                      {[col.dataType, ...types.filter((t) => t !== col.dataType)].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={col.isPrimaryKey}
                          onChange={(e) =>
                            patchColumn(index, {
                              isPrimaryKey: e.target.checked,
                              isNullable: e.target.checked ? false : col.isNullable,
                            })
                          }
                        />
                        PK
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={col.isNullable}
                          disabled={col.isPrimaryKey}
                          onChange={(e) => patchColumn(index, { isNullable: e.target.checked })}
                        />
                        Null
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={col.selected !== false}
                          onChange={(e) => patchColumn(index, { selected: e.target.checked })}
                        />
                        API
                      </label>
                      <button
                        type="button"
                        className="ml-auto text-[var(--danger)]"
                        onClick={() => removeColumn(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{col.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">{col.dataType}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <label className="flex items-center gap-1 text-[var(--muted)]">
                        <input
                          type="checkbox"
                          checked={col.selected !== false}
                          onChange={(e) => patchColumn(index, { selected: e.target.checked })}
                        />
                        API
                      </label>
                      <label className="flex items-center gap-1 text-[var(--muted)]">
                        <input
                          type="checkbox"
                          checked={Boolean(col.sensitive)}
                          onChange={(e) => patchColumn(index, { sensitive: e.target.checked })}
                        />
                        Sensitive
                      </label>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
