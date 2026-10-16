import "dotenv/config";
import { sealData } from "iron-session";
import { adminPool } from "../src/db/index";

async function main() {
  const email = process.argv[2] ?? "demo@uanglite.dev";
  const res = await adminPool.unsafe(
    "select u.id as user_id, m.org_id, m.role, u.name from users u join memberships m on m.user_id = u.id where u.email = $1",
    [email],
  );
  const row = res[0] as unknown as
    | { user_id: string; org_id: string; role: string; name: string }
    | undefined;
  if (!row) throw new Error(`No user: ${email}`);
  const password = process.env.SESSION_PASSWORD;
  if (!password) throw new Error("SESSION_PASSWORD is required");
  const seal = await sealData(
    {
      userId: row.user_id,
      orgId: row.org_id,
      role: row.role as "owner" | "staff",
      email,
      name: row.name,
    },
    { password, ttl: 604800 },
  );
  process.stdout.write(seal);
  await adminPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
