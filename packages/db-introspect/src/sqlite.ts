import Database from 'better-sqlite3';
import type { ConnectionConfig, ColumnMeta, ForeignKeyMeta, IntrospectionResult, TableMeta } from '@apiforge/shared';
import { buildConnectionString } from './connection.js';

export async function introspectSqlite(config: ConnectionConfig): Promise<IntrospectionResult> {
  const filePath = buildConnectionString(config);
  const db = new Database(filePath, { readonly: true, fileMustExist: true });

  try {
    const tablesRaw = db
      .prepare(
        `SELECT name, type FROM sqlite_master
         WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as Array<{ name: string; type: string }>;

    const foreignKeys: ForeignKeyMeta[] = [];
    const tables: TableMeta[] = [];

    for (const t of tablesRaw) {
      const colsRaw = db.prepare(`PRAGMA table_info(${quoteIdent(t.name)})`).all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

      const fkRaw = db.prepare(`PRAGMA foreign_key_list(${quoteIdent(t.name)})`).all() as Array<{
        id: number;
        table: string;
        from: string;
        to: string;
      }>;

      const fkMap = new Map(fkRaw.map((f) => [f.from, f]));

      for (const f of fkRaw) {
        foreignKeys.push({
          schema: 'main',
          table: t.name,
          column: f.from,
          referencedSchema: 'main',
          referencedTable: f.table,
          referencedColumn: f.to,
        });
      }

      const columns: ColumnMeta[] = colsRaw.map((col) => {
        const fk = fkMap.get(col.name);
        return {
          name: col.name,
          dataType: col.type || 'TEXT',
          isNullable: col.notnull === 0,
          isPrimaryKey: col.pk > 0,
          isForeignKey: Boolean(fk),
          isUnique: false,
          isIdentity: col.pk > 0 && /INT/i.test(col.type || ''),
          maxLength: null,
          defaultValue: col.dflt_value,
          foreignKeyTable: fk?.table ?? null,
          foreignKeyColumn: fk?.to ?? null,
          selected: true,
          sensitive: /password|senha|secret|token|hash/i.test(col.name),
        };
      });

      tables.push({
        schema: 'main',
        name: t.name,
        type: t.type === 'view' ? 'view' : 'table',
        columns,
        selected: false,
      });
    }

    return {
      engine: 'sqlite',
      database: filePath.split(/[/\\]/).pop() || 'sqlite',
      tables,
      foreignKeys,
    };
  } finally {
    db.close();
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
