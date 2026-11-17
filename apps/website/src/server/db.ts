import "server-only";
import { Pool } from "pg";

export type Row = Record<string, any>;

export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface Db extends Queryable {
  /** Runs fn in a single transaction (BEGIN/COMMIT, ROLLBACK on throw). */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

export function pgDb(pool: Pool): Db {
  return {
    async query(sql, params) {
      const r = await pool.query(sql, params as any[]);
      return { rows: r.rows };
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const q: Queryable = {
          async query(sql, params) {
            const r = await client.query(sql, params as any[]);
            return { rows: r.rows };
          },
        };
        const result = await fn(q);
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

let singleton: Db | null = null;

export function getDb(): Db {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    singleton = pgDb(new Pool({ connectionString: url, max: 5 }));
  }
  return singleton;
}
