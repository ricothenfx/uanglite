import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "https://uanglite.ricothen.com";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(base + "/login", { timeout: 45000 });
try {
  await page.waitForSelector("#email", { timeout: 30000 });
  console.log("RESULT: login form visible — challenge passed or none");
} catch {
  console.log("RESULT: #email never appeared");
  console.log("URL:", page.url());
  console.log("TITLE:", await page.title());
  const text = (await page.textContent("body"))?.slice(0, 300);
  console.log("BODY:", text);
  await page.screenshot({ path: "/tmp/kilo/challenge.png" });
}
await browser.close();
