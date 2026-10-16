import { chromium } from "@playwright/test";
import fs from "node:fs";
import { execSync } from "node:child_process";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const outDir = "docs/screenshots";
fs.mkdirSync(outDir, { recursive: true });

function mintCookie(): string {
  return execSync("pnpm exec tsx scripts/mint-session.ts demo@uanglite.dev", {
    encoding: "utf8",
    env: { ...process.env, ADMIN_DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL! },
  }).trim();
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const cookie = mintCookie();
const domain = new URL(base).hostname;
await context.addCookies([
  {
    name: "uanglite_session",
    value: cookie,
    domain,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);
const page = await context.newPage();

async function shot(path: string, file: string, before?: () => Promise<void>) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  if (before) await before();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${file}` });
  console.log("saved", file);
}

await shot("/dashboard", "dashboard.png");
await shot("/products", "products.png");
await shot("/pilot", "pilot.png", async () => {
  const input = page.getByPlaceholder("Ask about stock, invoices, KPIs…");
  await input.fill("How is the business doing this month?");
  await input.press("Enter");
  await page.waitForTimeout(15000);
});

await browser.close();
