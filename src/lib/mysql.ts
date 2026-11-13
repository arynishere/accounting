import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

export type MysqlConnConfig = {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
};

const pools = new Map<string, Pool>();

function poolKey(c: MysqlConnConfig): string {
  return `${c.host}:${c.port || 3306}|${c.user}|${c.database}`;
}

export function getMysqlPool(c: MysqlConnConfig): Pool {
  const key = poolKey(c);
  let pool = pools.get(key);
  if (!pool) {
    pool = mysql.createPool({
      host: c.host,
      port: c.port || 3306,
      user: c.user,
      password: c.password,
      database: c.database,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: "Z",
      dateStrings: true,
    });
    pools.set(key, pool);
  }
  return pool;
}

export async function mysqlQuery<T extends RowDataPacket[]>(
  c: MysqlConnConfig,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const pool = getMysqlPool(c);
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function mysqlPing(c: MysqlConnConfig): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const rows = await mysqlQuery<RowDataPacket[]>(c, "SELECT VERSION() AS v");
    return { ok: true, version: String(rows[0]?.v ?? "") };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "خطای MySQL",
    };
  }
}

export async function listTables(c: MysqlConnConfig): Promise<string[]> {
  const rows = await mysqlQuery<RowDataPacket[]>(
    c,
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [c.database],
  );
  return rows.map((r) => String(r.name));
}

export async function listColumns(
  c: MysqlConnConfig,
  table: string,
): Promise<Array<{ name: string; type: string }>> {
  const rows = await mysqlQuery<RowDataPacket[]>(
    c,
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [c.database, table],
  );
  return rows.map((r) => ({ name: String(r.name), type: String(r.type) }));
}
