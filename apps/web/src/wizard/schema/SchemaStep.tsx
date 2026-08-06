import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StepNav } from '../../components/StepNav';
import type { ColumnMeta, DbEngine, TableMeta } from '../../types';
import { FULL_OPERATIONS, READ_OPERATIONS, defaultOperations, hasAnyOperation } from '../../types';
import { SchemaPalette } from './SchemaPalette';
import { TableInspector } from './TableInspector';
import { TableNode, type TableNodeData } from './TableNode';

const nodeTypes: NodeTypes = {
  table: TableNode,
};

function tableKey(t: TableMeta): string {
  if (t.id) return t.id;
  return `${t.source ?? 'introspected'}:${t.schema}.${t.name}`;
}

function toNode(table: TableMeta, position: { x: number; y: number }): Node {
  return {
    id: tableKey(table),
    type: 'table',
    position,
    data: { table, label: table.name } satisfies TableNodeData,
  };
}

interface SchemaCanvasInnerProps {
  tables: TableMeta[];
  engine: DbEngine;
  onChange: (tables: TableMeta[]) => void;
  onBack: () => void;
  onNext: () => void;
}

function SchemaCanvasInner({ tables, engine, onChange, onBack, onNext }: SchemaCanvasInnerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layoutSeed = useRef(0);

  const onCanvas = useMemo(() => tables.filter((t) => t.selected !== false), [tables]);
  const available = useMemo(
    () => tables.filter((t) => t.source !== 'designed' && t.selected === false),
    [tables],
  );

  const initialNodes = useMemo(
    () =>
      onCanvas.map((t, i) =>
        toNode(t, {
          x: 80 + (i % 3) * 240,
          y: 60 + Math.floor(i / 3) * 140,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from tables when step mounts
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState([]);

  // Sync node data when tables change (inspector edits)
  useEffect(() => {
    setNodes((prev) => {
      const selectedKeys = new Set(onCanvas.map(tableKey));
      const kept = prev.filter((n) => selectedKeys.has(n.id));
      const keptIds = new Set(kept.map((n) => n.id));

      const updated = kept.map((n) => {
        const table = onCanvas.find((t) => tableKey(t) === n.id);
        if (!table) return n;
        return {
          ...n,
          data: { table, label: table.name } satisfies TableNodeData,
        };
      });

      const additions = onCanvas
        .filter((t) => !keptIds.has(tableKey(t)))
        .map((t) => {
          layoutSeed.current += 1;
          const n = layoutSeed.current;
          return toNode(t, {
            x: 100 + (n % 4) * 220,
            y: 80 + Math.floor(n / 4) * 130,
          });
        });

      return [...updated, ...additions];
    });
  }, [onCanvas, setNodes]);

  const selectedTable = useMemo(() => {
    if (!selectedId) return null;
    return tables.find((t) => tableKey(t) === selectedId) ?? null;
  }, [selectedId, tables]);

  const canContinue = useMemo(
    () => onCanvas.some((t) => hasAnyOperation(t) && t.columns.some((c) => c.selected !== false)),
    [onCanvas],
  );

  const onDragStart = useCallback((event: React.DragEvent, table: TableMeta) => {
    event.dataTransfer.setData('application/apiforge-table', tableKey(table));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const key = event.dataTransfer.getData('application/apiforge-table');
      if (!key) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onChange(
        tables.map((t) => (tableKey(t) === key ? { ...t, selected: true } : t)),
      );
      setSelectedId(key);
      setNodes((prev) => {
        if (prev.some((n) => n.id === key)) return prev;
        const table = tables.find((t) => tableKey(t) === key);
        if (!table) return prev;
        return [...prev, toNode({ ...table, selected: true }, position)];
      });
    },
    [onChange, screenToFlowPosition, setNodes, tables],
  );

  function createDesignedTable() {
    const id = `new_table_${Date.now().toString(36)}`;
    const pk: ColumnMeta = {
      name: 'id',
      dataType:
        engine === 'postgresql'
          ? 'SERIAL'
          : engine === 'mysql'
            ? 'INT AUTO_INCREMENT'
            : engine === 'sqlserver'
              ? 'INT IDENTITY(1,1)'
              : 'INTEGER',
      isNullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      isUnique: true,
      isIdentity: true,
      selected: true,
      sensitive: false,
    };
    const nameCol: ColumnMeta = {
      name: 'name',
      dataType:
        engine === 'sqlserver' ? 'NVARCHAR(255)' : engine === 'sqlite' ? 'TEXT' : 'VARCHAR(255)',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
      sensitive: false,
    };
    const table: TableMeta = {
      id: `designed:${id}`,
      schema: engine === 'sqlserver' ? 'dbo' : engine === 'postgresql' ? 'public' : 'main',
      name: id,
      type: 'table',
      source: 'designed',
      selected: true,
      operations: { ...FULL_OPERATIONS },
      columns: [pk, nameCol],
    };
    onChange([...tables, table]);
    setSelectedId(tableKey(table));
  }

  function updateTable(next: TableMeta) {
    onChange(tables.map((t) => (tableKey(t) === tableKey(next) ? next : t)));
  }

  function removeTable(table: TableMeta) {
    const key = tableKey(table);
    if (table.source === 'designed') {
      onChange(tables.filter((t) => tableKey(t) !== key));
    } else {
      onChange(tables.map((t) => (tableKey(t) === key ? { ...t, selected: false } : t)));
    }
    setSelectedId((id) => (id === key ? null : id));
    setNodes((prev) => prev.filter((n) => n.id !== key));
  }

  return (
    <div className="-mx-5 flex min-h-0 flex-1 flex-col lg:-mx-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-5 lg:px-0">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Schema</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Monte a API como no n8n: arraste tabelas, escolha métodos e desenhe tabelas novas.
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {onCanvas.length} no canvas · {available.length} na palette
        </p>
      </div>

      <div className="relative flex min-h-[min(70vh,640px)] flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <SchemaPalette
          available={available}
          filter={filter}
          onFilter={setFilter}
          onDragStart={onDragStart}
          onCreateTable={createDesignedTable}
        />

        <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
            fitView
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#2a3344" />
            <Controls
              showInteractive={false}
              className="!overflow-hidden !rounded-md !border ![border-color:var(--border)] ![background:var(--bg-elevated)]"
            />
            <MiniMap
              className="!overflow-hidden !rounded-md !border ![border-color:var(--border)] ![background:var(--bg-elevated)]"
              maskColor="rgba(12,14,20,0.7)"
              nodeColor="#00e5ff"
            />
          </ReactFlow>

          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]/95 px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)] shadow-lg backdrop-blur">
            <span className="font-medium uppercase tracking-[0.14em] text-[var(--cyan)]">Dica</span>
            <p className="mt-1">
              Arraste da palette, selecione o nó para marcar GET/POST/PUT/DELETE, ou crie uma tabela
              nova com tipos de coluna.
            </p>
          </div>
        </div>

        <TableInspector
          table={selectedTable}
          engine={engine}
          onChange={updateTable}
          onRemove={removeTable}
        />
      </div>

      <div className="mt-4 px-5 lg:px-0">
        <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canContinue} />
      </div>
    </div>
  );
}

interface SchemaStepProps {
  tables: TableMeta[];
  engine: DbEngine;
  onChange: (tables: TableMeta[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SchemaStep(props: SchemaStepProps) {
  return (
    <ReactFlowProvider>
      <SchemaCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export function prepareSchemaTables(tables: TableMeta[]): TableMeta[] {
  return tables.map((t) => ({
    ...t,
    source: t.source ?? 'introspected',
    selected: false,
    operations: defaultOperations({
      type: t.type,
      operations: t.type === 'view' ? READ_OPERATIONS : t.operations ?? FULL_OPERATIONS,
    }),
    columns: t.columns.map((c) => ({
      ...c,
      selected: c.selected ?? true,
      sensitive: c.sensitive ?? /password|secret|token|hash|ssn|salt/i.test(c.name),
    })),
  }));
}
