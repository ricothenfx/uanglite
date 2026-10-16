import "dotenv/config";
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync("/tmp/kilo/invoice.env", "utf8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("No DATABASE_URL in pulled env");
const adminUrl = match[1];

const url = new URL(adminUrl);
const host = url.host;
const ssl = url.searchParams.get("sslmode") ?? "require";

const admin = postgres(adminUrl, { max: 1 });

const existing = await admin.unsafe(
  "select 1 from pg_database where datname = 'uanglite'",
);
if (existing.length === 0) {
  await admin.unsafe("create database uanglite");
  console.log("created database uanglite");
} else {
  console.log("database uanglite already exists");
}
await admin.end();

const appPassword = process.env.PROD_APP_PASSWORD;
if (!appPassword) throw new Error("PROD_APP_PASSWORD required");

const query = {
  host,
  database: "uanglite",
  ssl,
};
console.log(JSON.stringify({ query }));
void postgres;
