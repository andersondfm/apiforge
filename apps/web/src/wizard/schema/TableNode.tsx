import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Database, Pencil } from 'lucide-react';
import type { TableMeta, TableOperations } from '../../types';
import { defaultOperations } from '../../types';

export type TableNodeData = {
  table: TableMeta;
  label: string;
};

const OP_LABELS: { key: keyof TableOperations; label: string }[] = [
  { key: 'list', label: 'GET' },
  { key: 'get', label: 'GET:id' },
  { key: 'create', label: 'POST' },
  { key: 'update', label: 'PUT' },
  { key: 'delete', label: 'DEL' },
];

function TableNodeComponent({ data, selected }: NodeProps & { data: TableNodeData }) {
  const { table } = data;
  const ops = defaultOperations(table);
  const designed = table.source === 'designed';
  const schemaLabel =
    table.schema && table.schema !== 'public' && table.schema !== 'dbo' && table.schema !== 'main'
      ? `${table.schema}.`
      : '';

  return (
    <div
      className={[
        'min-w-[200px] rounded-lg border bg-[var(--bg-elevated)] px-3 py-2.5 shadow-lg transition-shadow',
        selected
          ? 'border-[var(--cyan)] shadow-[0_0_0_1px_var(--cyan),0_0_24px_var(--cyan-glow)]'
          : 'border-[var(--border)]',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-[var(--bg)] !bg-[var(--cyan)]" />
      <div className="flex items-start gap-2">
        <span
          className={[
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
            designed
              ? 'border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]'
              : 'border-[var(--border)] bg-[var(--bg-soft)] text-[var(--cyan)]',
          ].join(' ')}
        >
          {designed ? <Pencil className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold tracking-tight">
            <span className="text-[var(--muted)]">{schemaLabel}</span>
            {table.name || 'untitled'}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {designed ? 'Designed' : table.type === 'view' ? 'View' : 'Table'} · {table.columns.length} cols
          </p>
        </div>
        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {OP_LABELS.filter(({ key }) => ops[key]).map(({ key, label }) => (
          <span
            key={key}
            className="rounded border border-[var(--cyan)]/25 bg-[var(--cyan-glow)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--cyan)]"
          >
            {label}
          </span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-[var(--bg)] !bg-[var(--cyan)]" />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
