import "dotenv/config";
import { adminPool } from "./index";
import { TENANT_TABLES } from "./tables";

const appUrl = process.env.DATABASE_URL;
if (!appUrl) throw new Error("DATABASE_URL is required");

const parsed = new URL(appUrl);
const role = parsed.username.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
const password = decodeURIComponent(parsed.password);

async function main() {
  await adminPool.unsafe(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN
         EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${role}', '${password.replaceAll("'", "''")}');
       ELSE
         EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', '${role}', '${password.replaceAll("'", "''")}');
       END IF;
     END $$;`,
  );

  await adminPool.unsafe(`GRANT USAGE ON SCHEMA public TO ${role};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role};
    REVOKE ALL ON users FROM ${role};
    GRANT SELECT (id, email, name, created_at) ON users TO ${role};`);

  for (const table of TENANT_TABLES) {
    await adminPool.unsafe(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS tenant_isolation ON ${table};
      CREATE POLICY tenant_isolation ON ${table}
        USING (org_id = current_setting('app.current_org', true)::uuid)
        WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);`);
  }

  console.log(
    `Database ready: role "${role}" is RLS-enforced on ${TENANT_TABLES.length} tenant tables.`,
  );
}

main()
  .then(() => adminPool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
