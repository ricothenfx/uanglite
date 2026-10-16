import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { adminPool, dba } from "./index";
import {
  agentDrafts,
  customers,
  llmCallLogs,
  memberships,
  organizations,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesInvoiceItems,
  salesInvoices,
  stockMovements,
  suppliers,
  users,
} from "./schema";
import { computeTotals, lineTotalCents } from "../lib/business";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261016);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function tsDaysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, randInt(0, 59), 0, 0);
  return d;
}

type ProductSeed = {
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  costCents: number;
  minStock: number;
  targetStock: number;
};

type TenantSeed = {
  name: string;
  slug: string;
  currency: string;
  taxBps: number;
  ownerEmail: string;
  products: ProductSeed[];
  customers: string[];
  suppliers: { name: string; categories: string[] }[];
  invoiceCount: number;
  bigUnits: boolean;
};

const TENANTS: TenantSeed[] = [
  {
    name: "Nusantara Coffee Roasters",
    slug: "nusantara-coffee",
    currency: "SGD",
    taxBps: 900,
    ownerEmail: "demo@uanglite.dev",
    invoiceCount: 120,
    bigUnits: false,
    products: [
      { sku: "COF-ESP-250", name: "Espresso Blend 250g", category: "beans", priceCents: 1800, costCents: 1020, minStock: 60, targetStock: 260 },
      { sku: "COF-FLT-250", name: "Filter Blend 250g", category: "beans", priceCents: 1900, costCents: 1080, minStock: 60, targetStock: 240 },
      { sku: "COF-SOL-1KG", name: "Single Origin — Gayo 1kg", category: "beans", priceCents: 4200, costCents: 2400, minStock: 40, targetStock: 180 },
      { sku: "COF-DEC-250", name: "Decaf Colombia 250g", category: "beans", priceCents: 2100, costCents: 1250, minStock: 30, targetStock: 5 },
      { sku: "EQP-V60-02", name: "V60 Dripper 02 Ceramic", category: "equipment", priceCents: 3400, costCents: 1900, minStock: 20, targetStock: 90 },
      { sku: "EQP-GRD-HND", name: "Hand Grinder Pro", category: "equipment", priceCents: 8900, costCents: 5200, minStock: 10, targetStock: 40 },
      { sku: "MER-TUM-BlK", name: "Tumbler Black 350ml", category: "merch", priceCents: 2500, costCents: 1300, minStock: 25, targetStock: -8 },
      { sku: "MER-TUM-WHT", name: "Tumbler White 350ml", category: "merch", priceCents: 2500, costCents: 1300, minStock: 25, targetStock: 110 },
      { sku: "MER-TEE-BLK", name: "Brand Tee Black", category: "merch", priceCents: 2900, costCents: 1400, minStock: 15, targetStock: 70 },
      { sku: "PKG-BAG-500", name: "Kraft Bags 500 pack", category: "packaging", priceCents: 4500, costCents: 2600, minStock: 20, targetStock: 85 },
      { sku: "PKG-STK-ROL", name: "Sticker Roll", category: "packaging", priceCents: 1200, costCents: 600, minStock: 30, targetStock: 140 },
      { sku: "CLB-SUB-MTH", name: "Coffee Club Subscription (1mo)", category: "service", priceCents: 5500, costCents: 3200, minStock: 0, targetStock: 500 },
    ],
    customers: [
      "Brekie Bar @ Katong",
      "The Daily Grind Cafe",
      "OfficePte Ltd",
      "Sunrise Bakery Group",
      "Campus Coffee Kiosks",
      "Hotel Miramar F&B",
      "Two Trees Espresso",
      "Weekend Markets Co",
    ],
    suppliers: [
      { name: "Gayo Green Beans Importer", categories: ["beans", "merch"] },
      { name: "PackSource Asia", categories: ["packaging"] },
      { name: "BrewTools Wholesale", categories: ["equipment"] },
    ],
  },
  {
    name: "Bali Surf Supplies",
    slug: "bali-surf",
    currency: "IDR",
    taxBps: 1100,
    ownerEmail: "surf@uanglite.dev",
    invoiceCount: 60,
    bigUnits: true,
    products: [
      { sku: "SRF-BRD-6FT", name: "Shortboard 6'0", category: "boards", priceCents: 85000000, costCents: 52000000, minStock: 4, targetStock: 12 },
      { sku: "SRF-BRD-7FT", name: "Funboard 7'2", category: "boards", priceCents: 98000000, costCents: 60000000, minStock: 3, targetStock: 8 },
      { sku: "SRF-FIN-TRI", name: "Tri Fin Set", category: "fins", priceCents: 12000000, costCents: 7000000, minStock: 10, targetStock: 30 },
      { sku: "SRF-WAX-PK", name: "Tropical Wax 3-pack", category: "accessories", priceCents: 1500000, costCents: 800000, minStock: 40, targetStock: 6 },
      { sku: "SRF-LEA-CMP", name: "Comp Leash 6ft", category: "accessories", priceCents: 4500000, costCents: 2500000, minStock: 15, targetStock: 45 },
      { sku: "APP-RSH-GRD", name: "Rash Guard L", category: "apparel", priceCents: 6500000, costCents: 3500000, minStock: 10, targetStock: 35 },
    ],
    customers: [
      "Canggu Surf School",
      "Uluwatu Board Club",
      "BeachRental Bali",
      "Kuta Surf Shop",
    ],
    suppliers: [
      { name: "SurfCraft Distributor", categories: ["boards", "fins", "accessories"] },
      { name: "Bali Apparel Print", categories: ["apparel"] },
    ],
  },
  {
    name: "Kinabalu Outdoor Co.",
    slug: "kinabalu-outdoor",
    currency: "MYR",
    taxBps: 600,
    ownerEmail: "outdoor@uanglite.dev",
    invoiceCount: 40,
    bigUnits: false,
    products: [
      { sku: "OUT-TNT-4P", name: "Tent 4 Person", category: "camping", priceCents: 45000, costCents: 27000, minStock: 8, targetStock: 28 },
      { sku: "OUT-SLP-BAG", name: "Sleeping Bag 10°C", category: "camping", priceCents: 22000, costCents: 13000, minStock: 10, targetStock: 40 },
      { sku: "OUT-HDL-300", name: "Headlamp 300lm", category: "gear", priceCents: 9500, costCents: 5200, minStock: 12, targetStock: 50 },
      { sku: "OUT-STV-PSM", name: "Pocket Stove", category: "gear", priceCents: 14000, costCents: 8100, minStock: 8, targetStock: 9 },
    ],
    customers: [
      "Kota Kinabalu Adventures",
      "Sabah Trek Tours",
      "Mountain Ridge Retail",
    ],
    suppliers: [
      { name: "Outdoor Gear Imports Sdn Bhd", categories: ["camping", "gear"] },
    ],
  },
];

async function seedTenant(tenant: TenantSeed, passwordHash: string) {
  const [org] = await dba
    .insert(organizations)
    .values({
      name: tenant.name,
      slug: tenant.slug,
      currency: tenant.currency,
      taxBps: tenant.taxBps,
    })
    .returning();

  const [owner] = await dba
    .insert(users)
    .values({
      email: tenant.ownerEmail,
      name: tenant.slug.replace(/-/g, " ") + " owner",
      passwordHash,
    })
    .returning();
  await dba
    .insert(memberships)
    .values({ userId: owner.id, orgId: org.id, role: "owner" });

  if (tenant.ownerEmail === "demo@uanglite.dev") {
    const [staff] = await dba
      .insert(users)
      .values({ email: "staff@uanglite.dev", name: "Sari Staff", passwordHash })
      .returning();
    await dba
      .insert(memberships)
      .values({ userId: staff.id, orgId: org.id, role: "staff" });
  }

  const productRows = await dba
    .insert(products)
    .values(
      tenant.products.map((p) => ({
        orgId: org.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        priceCents: p.priceCents,
        costCents: p.costCents,
        minStock: p.minStock,
        stockQty: 0,
      })),
    )
    .returning();

  const customerRows = await dba
    .insert(customers)
    .values(
      tenant.customers.map((name, i) => ({
        orgId: org.id,
        name,
        email: `billing${i + 1}@${tenant.slug}.example`,
        phone: "+" + randInt(600000000, 999999999),
      })),
    )
    .returning();

  const supplierRows = await dba
    .insert(suppliers)
    .values(
      tenant.suppliers.map((s, i) => ({
        orgId: org.id,
        name: s.name,
        email: `orders${i + 1}@${tenant.slug}-supply.example`,
      })),
    )
    .returning();

  const soldQty = new Map<string, number>();
  const year = new Date().getFullYear();
  let invSeq = 0;

  for (let i = 0; i < tenant.invoiceCount; i++) {
    const ageDays = randInt(0, 175);
    const termDays = randInt(10, 40);
    const issueDate = isoDaysAgo(ageDays);
    const dueDate = isoDaysAgo(ageDays - termDays);
    const customer = pick(customerRows);

    const lineCount = randInt(1, 4);
    const lines: {
      productId: string;
      description: string;
      qty: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }[] = [];
    const used = new Set<string>();
    for (let l = 0; l < lineCount; l++) {
      const product = pick(productRows);
      if (used.has(product.sku)) continue;
      used.add(product.sku);
      const qty = tenant.bigUnits
        ? randInt(1, 6)
        : randInt(1, product.priceCents > 5000 ? 4 : 15);
      const discount = rand() < 0.2 ? 0.95 : 1;
      const unitPriceCents = Math.round(product.priceCents * discount);
      lines.push({
        productId: product.id,
        description: `${product.sku} — ${product.name}`,
        qty,
        unitPriceCents,
        lineTotalCents: lineTotalCents(qty, unitPriceCents),
      });
      soldQty.set(product.sku, (soldQty.get(product.sku) ?? 0) + qty);
    }
    if (lines.length === 0) continue;

    const totals = computeTotals(lines, tenant.taxBps);
    const status =
      ageDays <= 20
        ? rand() < 0.4
          ? "draft"
          : rand() < 0.5
            ? "paid"
            : "sent"
        : ageDays <= 45
          ? rand() < 0.6
            ? "paid"
            : "sent"
          : rand() < 0.9
            ? "paid"
            : "sent";

    invSeq += 1;
    const createdAt = tsDaysAgo(ageDays);
    const [invoice] = await dba
      .insert(salesInvoices)
      .values({
        orgId: org.id,
        customerId: customer.id,
        number: `INV-${year}-${String(invSeq).padStart(4, "0")}`,
        status,
        issueDate,
        dueDate,
        subtotalCents: totals.subtotalCents,
        taxBps: tenant.taxBps,
        totalCents: totals.totalCents,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await dba.insert(salesInvoiceItems).values(
      lines.map((line) => ({
        orgId: org.id,
        invoiceId: invoice.id,
        productId: line.productId,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })),
    );

    if (status === "sent" || status === "paid") {
      await dba.insert(stockMovements).values(
        lines.map((line) => ({
          orgId: org.id,
          productId: line.productId,
          qty: -line.qty,
          reason: "sale",
          refType: "invoice",
          refId: invoice.id,
          note: invoice.number,
          createdAt,
        })),
      );
    }
  }

  const receivedQty = new Map<string, number>();
  let poSeq = 0;
  for (const supplierDef of tenant.suppliers) {
    const supplier = supplierRows.find((s) => s.name === supplierDef.name)!;
    const supplierSkus = tenant.products
      .filter((p) => supplierDef.categories.includes(p.category))
      .map((p) => p.sku);
    if (supplierSkus.length === 0) continue;

    for (let k = 0; k < randInt(1, 3); k++) {
      const ageDays = randInt(5, 150);
      const status = ageDays > 40 ? "received" : rand() < 0.5 ? "sent" : "draft";
      const poLines = supplierSkus
        .slice(0, randInt(1, Math.min(3, supplierSkus.length)))
        .map((sku) => {
          const product = productRows.find((p) => p.sku === sku)!;
          const qty = tenant.bigUnits ? randInt(5, 15) : randInt(30, 120);
          return {
            productId: product.id,
            description: `${product.sku} — ${product.name}`,
            qty,
            unitCostCents: product.costCents,
            lineTotalCents: lineTotalCents(qty, product.costCents),
          };
        });
      const subtotalCents = poLines.reduce(
        (sum, l) => sum + l.lineTotalCents,
        0,
      );
      poSeq += 1;
      const createdAt = tsDaysAgo(ageDays);
      const [po] = await dba
        .insert(purchaseOrders)
        .values({
          orgId: org.id,
          supplierId: supplier.id,
          number: `PO-${year}-${String(poSeq).padStart(4, "0")}`,
          status,
          orderDate: isoDaysAgo(ageDays),
          expectedDate: isoDaysAgo(ageDays - 14),
          subtotalCents,
          createdAt,
          updatedAt: createdAt,
        })
        .returning();

      await dba.insert(purchaseOrderItems).values(
        poLines.map((line) => ({
          orgId: org.id,
          poId: po.id,
          productId: line.productId,
          description: line.description,
          qty: line.qty,
          unitCostCents: line.unitCostCents,
          lineTotalCents: line.lineTotalCents,
        })),
      );

      if (status === "received") {
        for (const line of poLines) {
          receivedQty.set(
            line.description.split(" — ")[0],
            (receivedQty.get(line.description.split(" — ")[0]) ?? 0) + line.qty,
          );
          await dba.insert(stockMovements).values({
            orgId: org.id,
            productId: line.productId,
            qty: line.qty,
            reason: "purchase",
            refType: "purchase_order",
            refId: po.id,
            note: po.number,
            createdAt,
          });
        }
      }
    }
  }

  for (const seedProduct of tenant.products) {
    const product = productRows.find((p) => p.sku === seedProduct.sku)!;
    const sold = soldQty.get(seedProduct.sku) ?? 0;
    const received = receivedQty.get(seedProduct.sku) ?? 0;
    const finalQty = seedProduct.targetStock + received - sold;

    if (finalQty > -sold) {
      await dba.insert(stockMovements).values({
        orgId: org.id,
        productId: product.id,
        qty: Math.max(0, finalQty + sold - received),
        reason: "adjustment",
        note: "Opening stock",
        createdAt: tsDaysAgo(180),
      });
    }
    await dba
      .update(products)
      .set({ stockQty: finalQty })
      .where(eq(products.id, product.id));
  }

  const overdueSeed = await dba
    .select({ id: salesInvoices.id, number: salesInvoices.number })
    .from(salesInvoices)
    .where(
      inArray(salesInvoices.status, ["sent"]),
    )
    .limit(1);

  await dba.insert(agentDrafts).values({
    orgId: org.id,
    type: "payment_reminder",
    summary: `Sample reminder for ${overdueSeed[0]?.number ?? "an overdue invoice"} created during onboarding`,
    payload: {
      invoiceNumber: overdueSeed[0]?.number,
      to: `billing1@${tenant.slug}.example`,
      subject: "Payment reminder: friendly nudge",
      body: "Sample reminder drafted by the Pilot during onboarding.",
    },
    createdBy: owner.id,
  });

  if (tenant.ownerEmail === "demo@uanglite.dev") {
    const readTools = [
      "query_stock",
      "query_invoices",
      "business_summary",
      "detect_anomalies",
    ];
    const logs = Array.from({ length: 18 }, () => {
      const promptTokens = randInt(900, 2600);
      const completionTokens = randInt(150, 900);
      const costMicroUsd = Math.round(
        (promptTokens / 1e6) * 0.15 * 1e6 +
          (completionTokens / 1e6) * 0.6 * 1e6,
      );
      return {
        orgId: org.id,
        model: "gpt-4o-mini",
        steps: randInt(1, 4),
        toolNames: [
          pick(readTools.concat("create_purchase_order_draft")),
        ],
        promptTokens,
        completionTokens,
        costMicroUsd,
        latencyMs: randInt(900, 6500),
        createdAt: tsDaysAgo(randInt(0, 14), randInt(8, 20)),
      };
    });
    await dba.insert(llmCallLogs).values(logs);
  }

  const lowStock = tenant.products.filter((p) => {
    const finalQty = p.targetStock + (receivedQty.get(p.sku) ?? 0) - (soldQty.get(p.sku) ?? 0);
    return finalQty <= p.minStock;
  });
  return { lowStockCount: lowStock.length, invoiceCount: invSeq };
}

async function main() {
  console.log("Resetting demo data…");
  await dba.delete(agentDrafts);
  await dba.delete(llmCallLogs);
  await dba.delete(stockMovements);
  await dba.delete(salesInvoiceItems);
  await dba.delete(salesInvoices);
  await dba.delete(purchaseOrderItems);
  await dba.delete(purchaseOrders);
  await dba.delete(products);
  await dba.delete(customers);
  await dba.delete(suppliers);
  await dba.delete(memberships);
  await dba.delete(users);
  await dba.delete(organizations);

  const passwordHash = await bcrypt.hash("demo1234", 10);
  for (const tenant of TENANTS) {
    const stats = await seedTenant(tenant, passwordHash);
    console.log(
      `✓ ${tenant.name}: ${tenant.products.length} products, ${stats.invoiceCount} invoices, ${stats.lowStockCount} low/negative stock`,
    );
  }

  await adminPool.end();
  console.log("\nDemo accounts (password: demo1234)");
  console.log("  demo@uanglite.dev    — Nusantara Coffee Roasters (owner)");
  console.log("  staff@uanglite.dev   — Nusantara Coffee Roasters (staff)");
  console.log("  surf@uanglite.dev    — Bali Surf Supplies (owner)");
  console.log("  outdoor@uanglite.dev — Kinabalu Outdoor Co. (owner)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
