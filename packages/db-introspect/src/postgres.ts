import pg from 'pg';
import type { ConnectionConfig, ColumnMeta, ForeignKeyMeta, IntrospectionResult, TableMeta } from '@apiforge/shared';
import { buildConnectionString } from './connection.js';

const { Client } = pg;

export async function introspectPostgres(config: ConnectionConfig): Promise<IntrospectionResult> {
  const client = new Client({ connectionString: buildConnectionString(config) });
  await client.connect();

  try {
    const dbRes = await client.query<{ current_database: string }>('SELECT current_database()');
    const database = dbRes.rows[0]?.current_database || config.database || 'postgres';

    const tablesRes = await client.query<{ table_schema: string; table_name: string; table_type: string }>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_schema, table_name
    `);

    const colsRes = await client.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      column_default: string | null;
      ordinal_position: number;
    }>(`
      SELECT table_schema, table_name, column_name, data_type, is_nullable,
             character_maximum_length, column_default, ordinal_position
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name, ordinal_position
    `);

    const pkRes = await client.query<{ table_schema: string; table_name: string; column_name: string }>(`
      SELECT tc.table_schema, tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    `);

    const fkRes = await client.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      foreign_table_schema: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(`
      SELECT
        tc.table_schema, tc.table_name, kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    `);

    const uniqueRes = await client.query<{ table_schema: string; table_name: string; column_name: string }>(`
      SELECT tc.table_schema, tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    `);

    const pkSet = new Set(pkRes.rows.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`));
    const uniqueSet = new Set(uniqueRes.rows.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`));
    const fkMap = new Map(
      fkRes.rows.map((r) => [
        `${r.table_schema}.${r.table_name}.${r.column_name}`,
        r,
      ]),
    );

    const columnsByTable = new Map<string, ColumnMeta[]>();
    for (const col of colsRes.rows) {
      const key = `${col.table_schema}.${col.table_name}`;
      const fk = fkMap.get(`${key}.${col.column_name}`);
      const meta: ColumnMeta = {
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        isPrimaryKey: pkSet.has(`${key}.${col.column_name}`),
        isForeignKey: Boolean(fk),
        isUnique: uniqueSet.has(`${key}.${col.column_name}`),
        isIdentity: Boolean(col.column_default?.includes('nextval') || col.column_default?.includes('identity')),
        maxLength: col.character_maximum_length,
        defaultValue: col.column_default,
        foreignKeyTable: fk?.foreign_table_name ?? null,
        foreignKeyColumn: fk?.foreign_column_name ?? null,
        selected: true,
        sensitive: /password|senha|secret|token|hash/i.test(col.column_name),
      };
      const list = columnsByTable.get(key) || [];
      list.push(meta);
      columnsByTable.set(key, list);
    }

    const tables: TableMeta[] = tablesRes.rows.map((t) => ({
      schema: t.table_schema,
      name: t.table_name,
      type: t.table_type === 'VIEW' ? 'view' : 'table',
      columns: columnsByTable.get(`${t.table_schema}.${t.table_name}`) || [],
      selected: false,
    }));

    const foreignKeys: ForeignKeyMeta[] = fkRes.rows.map((r) => ({
      schema: r.table_schema,
      table: r.table_name,
      column: r.column_name,
      referencedSchema: r.foreign_table_schema,
      referencedTable: r.foreign_table_name,
      referencedColumn: r.foreign_column_name,
    }));

    return { engine: 'postgresql', database, tables, foreignKeys };
  } finally {
    await client.end();
  }
}
