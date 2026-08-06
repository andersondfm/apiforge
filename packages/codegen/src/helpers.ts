import type { ColumnMeta, GenerateConfig, TableMeta, TableOperations } from '@apiforge/shared';

export const FULL_OPERATIONS: Required<TableOperations> = {
  list: true,
  get: true,
  create: true,
  update: true,
  delete: true,
};

export const READ_OPERATIONS: Required<TableOperations> = {
  list: true,
  get: true,
  create: false,
  update: false,
  delete: false,
};

export function defaultOperations(table: Pick<TableMeta, 'type' | 'operations'>): Required<TableOperations> {
  const base = table.type === 'view' ? READ_OPERATIONS : FULL_OPERATIONS;
  return {
    list: table.operations?.list ?? base.list,
    get: table.operations?.get ?? base.get,
    create: table.operations?.create ?? base.create,
    update: table.operations?.update ?? base.update,
    delete: table.operations?.delete ?? base.delete,
  };
}

export function hasAnyOperation(table: Pick<TableMeta, 'type' | 'operations'>): boolean {
  const ops = defaultOperations(table);
  return ops.list || ops.get || ops.create || ops.update || ops.delete;
}

/** Keep only tables/columns the user selected (undefined counts as selected). */
export function selectedTables(config: GenerateConfig): TableMeta[] {
  return config.tables
    .filter((t) => t.selected !== false)
    .filter((t) => hasAnyOperation(t))
    .map((t) => ({
      ...t,
      source: t.source ?? 'introspected',
      operations: defaultOperations(t),
      columns: selectedColumns(t),
    }))
    .filter((t) => t.columns.length > 0);
}

export function selectedColumns(table: TableMeta): ColumnMeta[] {
  return table.columns.filter((c) => c.selected !== false);
}

export function pkColumn(table: TableMeta): ColumnMeta | undefined {
  return table.columns.find((c) => c.isPrimaryKey) ?? table.columns[0];
}

export function pascalCase(s: string): string {
  const parts = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Entity';
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function camelCase(s: string): string {
  const p = pascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'item';
}

export function pluralize(s: string): string {
  const lower = s.toLowerCase();
  if (lower.endsWith('ies')) return s;
  if (lower.endsWith('y') && !/[aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(s)) return `${s}es`;
  if (lower.endsWith('s')) return s;
  return `${s}s`;
}

/** Plural kebab-case route segment for a table. */
export function routeName(table: TableMeta): string {
  return kebabCase(pluralize(table.name));
}

/** Sanitize project name for npm package / .NET assembly. */
export function sanitizeProjectName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const alnum = cleaned.replace(/[^a-zA-Z0-9]/g, '') || 'ApiForgeProject';
  if (/^[0-9]/.test(alnum)) return `Api${alnum}`;
  return alnum;
}

export function csharpNamespace(name: string): string {
  return pascalCase(sanitizeProjectName(name)).replace(/[^a-zA-Z0-9_]/g, '') || 'ApiForgeProject';
}

export function publicColumns(table: TableMeta): ColumnMeta[] {
  return selectedColumns(table).filter((c) => !c.sensitive);
}

export function insertableColumns(table: TableMeta): ColumnMeta[] {
  return selectedColumns(table).filter((c) => !c.isIdentity);
}

export function updatableColumns(table: TableMeta): ColumnMeta[] {
  return selectedColumns(table).filter((c) => !c.isIdentity && !c.isPrimaryKey);
}

export function qualifiedTable(table: TableMeta, engine: GenerateConfig['connection']['engine']): string {
  const schema = table.schema;
  switch (engine) {
    case 'postgresql':
      if (schema && schema !== 'public') return `"${schema}"."${table.name}"`;
      return `"${table.name}"`;
    case 'mysql':
      return `\`${table.name}\``;
    case 'sqlserver':
      return `[${schema || 'dbo'}].[${table.name}]`;
    case 'sqlite':
    default:
      return `"${table.name}"`;
  }
}

export function quoteIdent(name: string, engine: GenerateConfig['connection']['engine']): string {
  switch (engine) {
    case 'postgresql':
      return `"${name}"`;
    case 'mysql':
      return `\`${name}\``;
    case 'sqlserver':
      return `[${name}]`;
    default:
      return `"${name}"`;
  }
}

export function paramPlaceholder(
  engine: GenerateConfig['connection']['engine'],
  index: number,
  name?: string,
): string {
  switch (engine) {
    case 'postgresql':
      return `$${index}`;
    case 'mysql':
    case 'sqlite':
      return '?';
    case 'sqlserver':
      return `@${name || `p${index}`}`;
    default:
      return '?';
  }
}
