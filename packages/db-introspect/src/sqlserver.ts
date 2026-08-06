import sql from 'mssql';
import type { ConnectionConfig, ColumnMeta, ForeignKeyMeta, IntrospectionResult, TableMeta } from '@apiforge/shared';
import { buildConnectionString } from './connection.js';

export async function introspectSqlServer(config: ConnectionConfig): Promise<IntrospectionResult> {
  const pool = await sql.connect(buildConnectionString(config));

  try {
    const dbRes = await pool.request().query<{ name: string }>('SELECT DB_NAME() AS name');
    const database = dbRes.recordset[0]?.name || config.database || 'master';

    const tablesRes = await pool.request().query<{
      table_schema: string;
      table_name: string;
      table_type: string;
    }>(`
      SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, TABLE_TYPE AS table_type
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    const colsRes = await pool.request().query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      column_default: string | null;
      ordinal_position: number;
    }>(`
      SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
             DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable,
             CHARACTER_MAXIMUM_LENGTH AS character_maximum_length,
             COLUMN_DEFAULT AS column_default, ORDINAL_POSITION AS ordinal_position
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);

    const pkRes = await pool.request().query<{
      table_schema: string;
      table_name: string;
      column_name: string;
    }>(`
      SELECT ku.TABLE_SCHEMA AS table_schema, ku.TABLE_NAME AS table_name, ku.COLUMN_NAME AS column_name
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
      WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    `);

    const fkRes = await pool.request().query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      referenced_schema: string;
      referenced_table: string;
      referenced_column: string;
    }>(`
      SELECT
        SCHEMA_NAME(fk.schema_id) AS table_schema,
        OBJECT_NAME(fk.parent_object_id) AS table_name,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
        SCHEMA_NAME(ref.schema_id) AS referenced_schema,
        OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      JOIN sys.objects ref ON fk.referenced_object_id = ref.object_id
    `);

    const identityRes = await pool.request().query<{
      table_schema: string;
      table_name: string;
      column_name: string;
    }>(`
      SELECT s.name AS table_schema, t.name AS table_name, c.name AS column_name
      FROM sys.columns c
      JOIN sys.tables t ON c.object_id = t.object_id
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE c.is_identity = 1
    `);

    const pkSet = new Set(pkRes.recordset.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`));
    const identitySet = new Set(
      identityRes.recordset.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`),
    );
    const fkMap = new Map(
      fkRes.recordset.map((r) => [`${r.table_schema}.${r.table_name}.${r.column_name}`, r]),
    );

    const columnsByTable = new Map<string, ColumnMeta[]>();
    for (const col of colsRes.recordset) {
      const key = `${col.table_schema}.${col.table_name}`;
      const fk = fkMap.get(`${key}.${col.column_name}`);
      const meta: ColumnMeta = {
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        isPrimaryKey: pkSet.has(`${key}.${col.column_name}`),
        isForeignKey: Boolean(fk),
        isUnique: false,
        isIdentity: identitySet.has(`${key}.${col.column_name}`),
        maxLength: col.character_maximum_length,
        defaultValue: col.column_default,
        foreignKeyTable: fk?.referenced_table ?? null,
        foreignKeyColumn: fk?.referenced_column ?? null,
        selected: true,
        sensitive: /password|senha|secret|token|hash/i.test(col.column_name),
      };
      const list = columnsByTable.get(key) || [];
      list.push(meta);
      columnsByTable.set(key, list);
    }

    const tables: TableMeta[] = tablesRes.recordset.map((t) => ({
      schema: t.table_schema,
      name: t.table_name,
      type: t.table_type === 'VIEW' ? 'view' : 'table',
      columns: columnsByTable.get(`${t.table_schema}.${t.table_name}`) || [],
      selected: false,
    }));

    const foreignKeys: ForeignKeyMeta[] = fkRes.recordset.map((r) => ({
      schema: r.table_schema,
      table: r.table_name,
      column: r.column_name,
      referencedSchema: r.referenced_schema,
      referencedTable: r.referenced_table,
      referencedColumn: r.referenced_column,
    }));

    return { engine: 'sqlserver', database, tables, foreignKeys };
  } finally {
    await pool.close();
  }
}
