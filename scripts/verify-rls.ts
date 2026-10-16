import "dotenv/config";
import { pool, adminPool } from "../src/db/index";

async function main() {
  const orgs = await adminPool.unsafe<{ id: string; name: string }[]>(
    "select id, name from organizations order by name",
  );
  const [a, b] = orgs;

  const withoutTenant = await pool.unsafe(
    "select count(*)::int as rows from products",
  );
  console.log(
    `[RLS] app role, no tenant context: ${withoutTenant[0].rows} product rows visible (expected 0)`,
  );

  const counts = await pool.begin(async (tx) => {
    await tx.unsafe("select set_config('app.current_org', $1, true)", [a.id]);
    const asA = await tx.unsafe<{ count: number }[]>(
      "select count(*)::int as count from products",
    );
    await tx.unsafe("select set_config('app.current_org', $1, true)", [b.id]);
    const asB = await tx.unsafe<{ count: number }[]>(
      "select count(*)::int as count from products",
    );
    return { asA: asA[0].count, asB: asB[0].count };
  });

  console.log(
    `[RLS] as "${a.name}": ${counts.asA} products — as "${b.name}": ${counts.asB} products (isolated)`,
  );

  await pool
    .begin(async (tx) => {
      await tx.unsafe(
        "update products set stock_qty = 999 where org_id = $1",
        [b.id],
      );
      console.log("[RLS] cross-tenant write: LEAKED (bad)");
    })
    .catch(() => {
      console.log("[RLS] cross-tenant write: blocked (expected)");
    });

  await pool.end();
  await adminPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
