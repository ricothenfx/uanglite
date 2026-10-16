import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const appUrl = requireEnv("DATABASE_URL");
const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;

export const pool = postgres(appUrl, { max: 10 });
export const db = drizzle(pool, { schema });

export const adminPool = postgres(adminUrl, { max: 5 });
export const dba = drizzle(adminPool, { schema });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertUuid(value: string): string {
  if (!isUuid(value)) {
    throw new Error(`Invalid uuid: ${value.slice(0, 8)}…`);
  }
  return value;
}

type TenantDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` inside a transaction whose Row-Level Security context is pinned
 * to `orgId`. The connection role (`uanglite_app`) has no BYPASSRLS privilege,
 * so every statement can only touch rows of the current tenant.
 */
export async function withTenant<T>(
  orgId: string,
  fn: (tx: TenantDb) => Promise<T>,
): Promise<T> {
  assertUuid(orgId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org', ${orgId}, true)`);
    return fn(tx);
  });
}

export type { TenantDb };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and adjust the values.`,
    );
  }
  return value;
}
