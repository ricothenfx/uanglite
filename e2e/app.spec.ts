import { expect, test } from "@playwright/test";

test.describe("UangLite smoke", () => {
  test("redirects unauthenticated visitors to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("demo tenant can sign in and see the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "demo@uanglite.dev");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Revenue this month")).toBeVisible();
    await expect(page.getByText("Outstanding")).toBeVisible();
  });

  test("creating a product adds it to the catalog", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "demo@uanglite.dev");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/products");
    await page.getByRole("button", { name: "New product" }).click();
    await page.fill("#np-sku", "E2E-TEST-001");
    await page.fill("#np-name", "E2E Test Product");
    await page.fill("#np-price", "12.34");
    await page.fill("#np-opening", "7");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page.getByText("E2E-TEST-001")).toBeVisible();
  });

  test("pilot chat renders its grounded-approval scaffold", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "demo@uanglite.dev");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/pilot");
    await expect(page.getByText("Your business pilot")).toBeVisible();
    await expect(
      page.getByPlaceholder("Ask about stock, invoices, KPIs…"),
    ).toBeVisible();
  });

  test("multi-tenancy keeps tenants isolated", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "surf@uanglite.dev");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/products");
    await expect(page.getByText("Bali Surf Supplies").first()).toBeVisible();
    await expect(page.getByText("Nusantara Coffee Roasters")).toHaveCount(0);
    await expect(page.getByText("COF-ESP-250")).toHaveCount(0);
  });
});

test.describe("UangLite UX", () => {
  test("faq page is public and answers the basics", async ({ page }) => {
    await page.goto("/faq");
    await expect(page).toHaveURL(/\/faq/);
    await expect(page.getByText("Frequently asked questions")).toBeVisible();

    await page.getByText("What is UangLite?").click();
    await expect(
      page.getByText("mini-ERP for small trading businesses"),
    ).toBeVisible();
  });

  test("theme toggle switches to dark and persists across reloads", async ({
    page,
  }) => {
    await page.goto("/faq");
    const root = page.locator("html");
    await expect(root).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(root).toHaveClass(/dark/);

    await page.reload();
    await expect(root).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(root).not.toHaveClass(/dark/);
  });

  test("dashboard metrics expose tooltips", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "demo@uanglite.dev");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const btn = page.getByRole("button", {
      name: /Info: Sum of all invoice totals/,
    });
    const tip = btn.locator("xpath=..").getByRole("tooltip");
    await expect(tip).toHaveCSS("opacity", "0");

    await btn.focus();
    await expect(tip).toHaveCSS("opacity", "1");
    await expect(tip).toContainText("calendar month");
  });
});
