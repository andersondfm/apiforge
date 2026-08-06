import type { ColumnMeta, DetectedAuthTable, TableMeta } from '@apiforge/shared';

const USERNAME_CANDIDATES = ['username', 'user_name', 'login', 'email', 'user', 'usuario'];
const PASSWORD_CANDIDATES = ['password', 'passwd', 'pass', 'senha', 'pwd', 'password_hash', 'senha_hash'];
const ID_CANDIDATES = ['id', 'user_id', 'userid', 'uuid'];

function findColumn(columns: ColumnMeta[], candidates: string[]): ColumnMeta | undefined {
  const lower = columns.map((c) => ({ col: c, name: c.name.toLowerCase() }));
  for (const cand of candidates) {
    const hit = lower.find((x) => x.name === cand);
    if (hit) return hit.col;
  }
  for (const cand of candidates) {
    const hit = lower.find((x) => x.name.includes(cand));
    if (hit) return hit.col;
  }
  return undefined;
}

function tableNameScore(name: string): number {
  const n = name.toLowerCase();
  if (['users', 'user', 'usuarios', 'accounts', 'account', 'auth_users', 'app_users'].includes(n)) return 3;
  if (n.includes('user') || n.includes('auth') || n.includes('login') || n.includes('account')) return 2;
  return 0;
}

export function detectAuthTables(tables: TableMeta[]): DetectedAuthTable[] {
  const results: DetectedAuthTable[] = [];

  for (const table of tables) {
    const usernameCol = findColumn(table.columns, USERNAME_CANDIDATES);
    const passwordCol = findColumn(table.columns, PASSWORD_CANDIDATES);
    if (!usernameCol || !passwordCol) continue;

    const idCol =
      findColumn(table.columns, ID_CANDIDATES) ||
      table.columns.find((c) => c.isPrimaryKey) ||
      table.columns[0];

    if (!idCol) continue;

    const score = tableNameScore(table.name) + (usernameCol.name.toLowerCase() === 'username' || usernameCol.name.toLowerCase() === 'email' ? 1 : 0);

    results.push({
      schema: table.schema,
      table: table.name,
      usernameColumn: usernameCol.name,
      passwordColumn: passwordCol.name,
      idColumn: idCol.name,
      confidence: score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low',
    });
  }

  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}
