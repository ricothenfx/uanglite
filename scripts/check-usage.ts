import "dotenv/config";
import { adminPool } from "../src/db/index";

async function main() {
  const r = await adminPool.unsafe(
    "select model, count(*)::int as calls, sum(cost_micro_usd)::float8 as micro from llm_call_logs group by 1",
  );
  console.log(JSON.stringify(r));
  await adminPool.end();
}

main();
