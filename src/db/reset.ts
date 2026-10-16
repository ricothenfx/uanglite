import "dotenv/config";
import { adminPool } from "./index";

async function main() {
  await adminPool.unsafe(`DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;`);
  console.log("Schema dropped and recreated.");
}

main()
  .then(() => adminPool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
