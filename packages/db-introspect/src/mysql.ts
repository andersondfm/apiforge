import mysql from 'mysql2/promise';
import type { ConnectionConfig, ColumnMeta, ForeignKeyMeta, IntrospectionResult, TableMeta } from '@apiforge/shared';

export async function introspectMysql(config: ConnectionConfig): Promise<IntrospectionResult> {
  const connection = await mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.username || 'root',
    password: config.password || '',
    database: config.database,
    uri: config.connectionString || undefined,
  });

  try {
    const [dbRows] = await connection.query<mysql.RowDataPacket[]>('SELECT DATABASE() AS db');
    const dbName = config.database || (dbRows[0] as { db: string } | undefined)?.db || 'mysql';

    const [tablesRaw] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, TABLE_TYPE AS table_type
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_NAME
    `);

    const [colsRaw] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE,
             CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, ORDINAL_POSITION
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    const [fkRaw] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME,
             REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const fkMap = new Map<string, mysql.RowDataPacket>();
    for (const r of fkRaw) {
      fkMap.set(`${r.TABLE_SCHEMA}.${r.TABLE_NAME}.${r.COLUMN_NAME}`, r);
    }

    const columnsByTable = new Map<string, ColumnMeta[]>();
    for (const col of colsRaw) {
      const key = `${col.TABLE_SCHEMA}.${col.TABLE_NAME}`;
      const fk = fkMap.get(`${key}.${col.COLUMN_NAME}`);
      const meta: ColumnMeta = {
        name: col.COLUMN_NAME,
        dataType: col.DATA_TYPE,
        isNullable: col.IS_NULLABLE === 'YES',
        isPrimaryKey: col.COLUMN_KEY === 'PRI',
        isForeignKey: Boolean(fk),
        isUnique: col.COLUMN_KEY === 'UNI',
        isIdentity: String(col.EXTRA || '').includes('auto_increment'),
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        defaultValue: col.COLUMN_DEFAULT,
        foreignKeyTable: fk?.REFERENCED_TABLE_NAME ?? null,
        foreignKeyColumn: fk?.REFERENCED_COLUMN_NAME ?? null,
        selected: true,
        sensitive: /password|senha|secret|token|hash/i.test(col.COLUMN_NAME),
      };
      const list = columnsByTable.get(key) || [];
      list.push(meta);
      columnsByTable.set(key, list);
    }

    const tables: TableMeta[] = tablesRaw.map((t) => ({
      schema: t.table_schema,
      name: t.table_name,
      type: String(t.table_type).includes('VIEW') ? 'view' : 'table',
      columns: columnsByTable.get(`${t.table_schema}.${t.table_name}`) || [],
      selected: false,
    }));

    const foreignKeys: ForeignKeyMeta[] = fkRaw.map((r) => ({
      schema: r.TABLE_SCHEMA,
      table: r.TABLE_NAME,
      column: r.COLUMN_NAME,
      referencedSchema: r.REFERENCED_TABLE_SCHEMA,
      referencedTable: r.REFERENCED_TABLE_NAME,
      referencedColumn: r.REFERENCED_COLUMN_NAME,
    }));

    return { engine: 'mysql', database: dbName, tables, foreignKeys };
  } finally {
    await connection.end();
  }
}
