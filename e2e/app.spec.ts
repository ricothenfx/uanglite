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
