import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import {
  agentDrafts,
  customers,
  llmCallLogs,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesInvoiceItems,
  salesInvoices,
  stockMovements,
  suppliers,
} from "@/db/schema";
import {
  findAnomalies,
  isOverdue,
  type Anomaly,
  type InvoiceStatus,
  type PoStatus,
} from "./business";
import { todayIso } from "./utils";

export type ProductRow = typeof products.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type SupplierRow = typeof suppliers.$inferSelect;

export async function listProducts(
  orgId: string,
  opts: { lowStockOnly?: boolean; sku?: string; activeOnly?: boolean } = {},
) {
  return withTenant(orgId, async (tx) => {
    const conditions = [];
    if (opts.lowStockOnly) {
      conditions.push(sql`${products.stockQty} <= ${products.minStock}`);
    }
    if (opts.sku) {
      conditions.push(sql`lower(${products.sku}) = lower(${opts.sku})`);
    }
    if (opts.activeOnly) conditions.push(eq(products.active, true));
    return tx
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(products.sku));
  });
}

export async function getProduct(orgId: string, id: string) {
  return withTenant(orgId, async (tx) => {
    const [row] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return row ?? null;
  });
}

export async function listCustomers(orgId: string) {
  return withTenant(orgId, (tx) =>
    tx.select().from(customers).orderBy(asc(customers.name)),
  );
}

export async function listSuppliers(orgId: string) {
  return withTenant(orgId, (tx) =>
    tx.select().from(suppliers).orderBy(asc(suppliers.name)),
  );
}

export type InvoiceListRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  customerName: string;
  overdue: boolean;
};

export async function listInvoices(
  orgId: string,
  opts: { status?: InvoiceStatus; limit?: number } = {},
): Promise<InvoiceListRow[]> {
  const today = todayIso();
  return withTenant(orgId, async (tx) => {
    const rows = await tx
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        status: salesInvoices.status,
        issueDate: salesInvoices.issueDate,
        dueDate: salesInvoices.dueDate,
        totalCents: salesInvoices.totalCents,
        customerName: customers.name,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(customers.id, salesInvoices.customerId))
      .where(opts.status ? eq(salesInvoices.status, opts.status) : undefined)
      .orderBy(desc(salesInvoices.issueDate), desc(salesInvoices.number))
      .limit(opts.limit ?? 200);
    return rows.map((r) => ({ ...r, overdue: isOverdue(r, today) }));
  });
}

export async function getInvoiceDetail(orgId: string, id: string) {
  return withTenant(orgId, async (tx) => {
    const [invoice] = await tx
      .select({
        invoice: salesInvoices,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(customers.id, salesInvoices.customerId))
      .where(eq(salesInvoices.id, id))
      .limit(1);
    if (!invoice) return null;
    const items = await tx
      .select({
        id: salesInvoiceItems.id,
        description: salesInvoiceItems.description,
        qty: salesInvoiceItems.qty,
        unitPriceCents: salesInvoiceItems.unitPriceCents,
        lineTotalCents: salesInvoiceItems.lineTotalCents,
        sku: products.sku,
      })
      .from(salesInvoiceItems)
      .innerJoin(products, eq(products.id, salesInvoiceItems.productId))
      .where(eq(salesInvoiceItems.invoiceId, id))
      .orderBy(asc(salesInvoiceItems.id));
    return { ...invoice.invoice, customerName: invoice.customerName, customerEmail: invoice.customerEmail, items };
  });
}

export type PoListRow = {
  id: string;
  number: string;
  status: PoStatus;
  orderDate: string;
  expectedDate: string | null;
  subtotalCents: number;
  supplierName: string;
  arrivalOverdue: boolean;
};

export async function listPurchaseOrders(
  orgId: string,
  opts: { status?: PoStatus; openOnly?: boolean } = {},
): Promise<PoListRow[]> {
  const today = todayIso();
  return withTenant(orgId, async (tx) => {
    const rows = await tx
      .select({
        id: purchaseOrders.id,
        number: purchaseOrders.number,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        subtotalCents: purchaseOrders.subtotalCents,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(
        opts.status
          ? eq(purchaseOrders.status, opts.status)
          : opts.openOnly
            ? inArray(purchaseOrders.status, ["draft", "sent"])
            : undefined,
      )
      .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrders.number));
    return rows.map((r) => ({
      ...r,
      arrivalOverdue:
        r.status === "sent" &&
        r.expectedDate !== null &&
        r.expectedDate < today,
    }));
  });
}

export async function getPoDetail(orgId: string, id: string) {
  return withTenant(orgId, async (tx) => {
    const [po] = await tx
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(eq(purchaseOrders.id, id))
      .limit(1);
    if (!po) return null;
    const items = await tx
      .select({
        id: purchaseOrderItems.id,
        description: purchaseOrderItems.description,
        qty: purchaseOrderItems.qty,
        unitCostCents: purchaseOrderItems.unitCostCents,
        lineTotalCents: purchaseOrderItems.lineTotalCents,
        sku: products.sku,
      })
      .from(purchaseOrderItems)
      .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
      .where(eq(purchaseOrderItems.poId, id))
      .orderBy(asc(purchaseOrderItems.id));
    return { ...po.po, supplierName: po.supplierName, supplierEmail: po.supplierEmail, items };
  });
}

export async function nextSequence(
  orgId: string,
  kind: "invoice" | "po",
): Promise<string> {
  return withTenant(orgId, async (tx) => {
    if (kind === "invoice") {
      const [row] = await tx
        .select({
          maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${salesInvoices.number}, '^.*-', ''), '')::int), 0)`,
        })
        .from(salesInvoices);
      return String(row.maxNum + 1);
    }
    const [row] = await tx
      .select({
        maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${purchaseOrders.number}, '^.*-', ''), '')::int), 0)`,
      })
      .from(purchaseOrders);
    return String(row.maxNum + 1);
  });
}

export type DashboardData = {
  monthRevenue: { month: string; cents: number }[];
  revenueMtdCents: number;
  outstanding: { count: number; cents: number };
  overdue: { count: number; cents: number };
  lowStock: { count: number; items: { sku: string; name: string; stockQty: number; minStock: number }[] };
  recentInvoices: InvoiceListRow[];
};

export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const today = todayIso();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const fromIso = sixMonthsAgo.toISOString().slice(0, 10);

  return withTenant(orgId, async (tx) => {
    const monthRows = await tx
      .select({
        month: sql<string>`to_char(date_trunc('month', ${salesInvoices.issueDate}), 'YYYY-MM')`,
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .where(
        and(
          inArray(salesInvoices.status, ["paid", "sent"]),
          gte(salesInvoices.issueDate, fromIso),
        ),
      )
      .groupBy(sql`date_trunc('month', ${salesInvoices.issueDate})`)
      .orderBy(sql`date_trunc('month', ${salesInvoices.issueDate})`);

    const [outstanding] = await tx
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.status, "sent"));

    const [overdueRow] = await tx
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .where(
        and(eq(salesInvoices.status, "sent"), sql`${salesInvoices.dueDate} < ${today}`),
      );

    const lowStockItems = await tx
      .select({
        sku: products.sku,
        name: products.name,
        stockQty: products.stockQty,
        minStock: products.minStock,
      })
      .from(products)
      .where(sql`${products.stockQty} <= ${products.minStock}`)
      .orderBy(asc(products.stockQty))
      .limit(8);

    const recentRows = await tx
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        status: salesInvoices.status,
        issueDate: salesInvoices.issueDate,
        dueDate: salesInvoices.dueDate,
        totalCents: salesInvoices.totalCents,
        customerName: customers.name,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(customers.id, salesInvoices.customerId))
      .orderBy(desc(salesInvoices.createdAt))
      .limit(6);

    return {
      monthRevenue: monthRows.map((r) => ({ month: r.month, cents: r.cents })),
      revenueMtdCents: monthRows.find(
        (r) => r.month === today.slice(0, 7),
      )?.cents ?? 0,
      outstanding: { count: outstanding.count, cents: outstanding.cents },
      overdue: { count: overdueRow.count, cents: overdueRow.cents },
      lowStock: { count: lowStockItems.length, items: lowStockItems },
      recentInvoices: recentRows.map((r) => ({
        ...r,
        overdue: isOverdue(r, today),
      })),
    };
  });
}

export async function detectAnomaliesData(orgId: string): Promise<Anomaly[]> {
  const today = todayIso();
  return withTenant(orgId, async (tx) => {
    const productRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        stockQty: products.stockQty,
      })
      .from(products);

    const sentRows = await tx
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        status: salesInvoices.status,
        dueDate: salesInvoices.dueDate,
        storedTotalCents: salesInvoices.totalCents,
        computedCents: sql<number>`coalesce(sum(${salesInvoiceItems.lineTotalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .leftJoin(salesInvoiceItems, eq(salesInvoiceItems.invoiceId, salesInvoices.id))
      .where(inArray(salesInvoices.status, ["draft", "sent", "paid"]))
      .groupBy(
        salesInvoices.id,
        salesInvoices.number,
        salesInvoices.status,
        salesInvoices.dueDate,
        salesInvoices.totalCents,
      );

    const taxRows = await tx
      .select({ id: salesInvoices.id, taxBps: salesInvoices.taxBps })
      .from(salesInvoices)
      .where(inArray(salesInvoices.status, ["draft", "sent", "paid"]));
    const taxByInvoice = new Map(taxRows.map((r) => [r.id, r.taxBps]));

    return findAnomalies({
      todayIso: today,
      products: productRows,
      invoices: sentRows.map((r) => {
        const taxBps = taxByInvoice.get(r.id) ?? 0;
        return {
          id: r.id,
          number: r.number,
          status: r.status,
          dueDate: r.dueDate,
          storedTotalCents: r.storedTotalCents,
          computedTotalCents: Math.round(r.computedCents * (1 + taxBps / 10_000)),
        };
      }),
    });
  });
}

export async function listAgentDrafts(orgId: string) {
  return withTenant(orgId, (tx) =>
    tx
      .select()
      .from(agentDrafts)
      .orderBy(desc(agentDrafts.createdAt))
      .limit(100),
  );
}

export async function getUsageData(orgId: string) {
  return withTenant(orgId, async (tx) => {
    const byDay = await tx
      .select({
        day: sql<string>`to_char(date_trunc('day', ${llmCallLogs.createdAt}), 'YYYY-MM-DD')`,
        calls: sql<number>`count(*)::int`,
        costMicroUsd: sql<number>`coalesce(sum(${llmCallLogs.costMicroUsd}), 0)::float8`,
        promptTokens: sql<number>`coalesce(sum(${llmCallLogs.promptTokens}), 0)::float8`,
        completionTokens: sql<number>`coalesce(sum(${llmCallLogs.completionTokens}), 0)::float8`,
      })
      .from(llmCallLogs)
      .groupBy(sql`date_trunc('day', ${llmCallLogs.createdAt})`)
      .orderBy(desc(sql`date_trunc('day', ${llmCallLogs.createdAt})`))
      .limit(30);

    const byModel = await tx
      .select({
        model: llmCallLogs.model,
        calls: sql<number>`count(*)::int`,
        costMicroUsd: sql<number>`coalesce(sum(${llmCallLogs.costMicroUsd}), 0)::float8`,
        toolCalls: sql<number>`coalesce(sum(${llmCallLogs.steps}), 0)::float8`,
      })
      .from(llmCallLogs)
      .groupBy(llmCallLogs.model);

    const recent = await tx
      .select()
      .from(llmCallLogs)
      .orderBy(desc(llmCallLogs.createdAt))
      .limit(20);

    return { byDay, byModel, recent };
  });
}

export async function getStockMovements(orgId: string, productId: string) {
  return withTenant(orgId, (tx) =>
    tx
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50),
  );
}

export type SupplierStatsRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  poCount: number;
  openPoCount: number;
  orderedCents: number;
  lastOrderDate: string | null;
  skus: string[];
};

export async function listSuppliersWithStats(
  orgId: string,
  opts: { sku?: string } = {},
): Promise<SupplierStatsRow[]> {
  return withTenant(orgId, async (tx) => {
    const stats = await tx
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        poCount: sql<number>`count(${purchaseOrders.id})::int`,
        openPoCount:
          sql<number>`count(case when ${purchaseOrders.status} in ('draft', 'sent') then 1 end)::int`,
        orderedCents:
          sql<number>`coalesce(sum(case when ${purchaseOrders.status} <> 'void' then ${purchaseOrders.subtotalCents} else 0 end), 0)::float8`,
        lastOrderDate: sql<string | null>`max(${purchaseOrders.orderDate})`,
      })
      .from(suppliers)
      .leftJoin(purchaseOrders, eq(purchaseOrders.supplierId, suppliers.id))
      .groupBy(suppliers.id, suppliers.name, suppliers.email, suppliers.phone)
      .orderBy(asc(suppliers.name));

    const productRows = await tx
      .selectDistinct({
        supplierId: purchaseOrders.supplierId,
        sku: products.sku,
        name: products.name,
      })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderItems.poId))
      .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
      .where(
        opts.sku
          ? sql`lower(${products.sku}) = lower(${opts.sku})`
          : undefined,
      )
      .orderBy(asc(products.sku));

    const skusBySupplier = new Map<string, string[]>();
    for (const row of productRows) {
      const list = skusBySupplier.get(row.supplierId) ?? [];
      list.push(`${row.sku} — ${row.name}`);
      skusBySupplier.set(row.supplierId, list);
    }

    return stats
      .filter((s) => (opts.sku ? skusBySupplier.has(s.id) : true))
      .map((s) => ({ ...s, skus: skusBySupplier.get(s.id) ?? [] }));
  });
}

export type CustomerStatsRow = {
  id: string;
  name: string;
  email: string | null;
  invoiceCount: number;
  invoicedCents: number;
  outstandingCents: number;
  overdueCount: number;
  overdueCents: number;
};

export async function listCustomersWithStats(
  orgId: string,
): Promise<CustomerStatsRow[]> {
  const today = todayIso();
  return withTenant(orgId, (tx) =>
    tx
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        invoiceCount: sql<number>`count(${salesInvoices.id})::int`,
        invoicedCents:
          sql<number>`coalesce(sum(case when ${salesInvoices.status} <> 'void' then ${salesInvoices.totalCents} else 0 end), 0)::float8`,
        outstandingCents:
          sql<number>`coalesce(sum(case when ${salesInvoices.status} = 'sent' then ${salesInvoices.totalCents} else 0 end), 0)::float8`,
        overdueCount:
          sql<number>`count(case when ${salesInvoices.status} = 'sent' and ${salesInvoices.dueDate} < ${today} then 1 end)::int`,
        overdueCents:
          sql<number>`coalesce(sum(case when ${salesInvoices.status} = 'sent' and ${salesInvoices.dueDate} < ${today} then ${salesInvoices.totalCents} else 0 end), 0)::float8`,
      })
      .from(customers)
      .leftJoin(salesInvoices, eq(salesInvoices.customerId, customers.id))
      .groupBy(customers.id, customers.name, customers.email)
      .orderBy(asc(customers.name)),
  );
}

export type ProductSalesRow = {
  sku: string;
  name: string;
  qtySold: number;
  orderCount: number;
  revenueCents: number;
};

export async function getProductSales(
  orgId: string,
  period: "week" | "month" | "quarter" | "year" | "all" = "month",
): Promise<ProductSalesRow[]> {
  const days =
    period === "week"
      ? 7
      : period === "month"
        ? 30
        : period === "quarter"
          ? 90
          : period === "year"
            ? 365
            : null;
  return withTenant(orgId, async (tx) => {
    const conditions = [inArray(salesInvoices.status, ["sent", "paid"])];
    if (days !== null) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      conditions.push(
        gte(salesInvoices.issueDate, since.toISOString().slice(0, 10)),
      );
    }
    return tx
      .select({
        sku: products.sku,
        name: products.name,
        qtySold: sql<number>`coalesce(sum(${salesInvoiceItems.qty}), 0)::int`,
        orderCount: sql<number>`count(distinct ${salesInvoices.id})::int`,
        revenueCents:
          sql<number>`coalesce(sum(${salesInvoiceItems.lineTotalCents}), 0)::float8`,
      })
      .from(salesInvoiceItems)
      .innerJoin(salesInvoices, eq(salesInvoices.id, salesInvoiceItems.invoiceId))
      .innerJoin(products, eq(products.id, salesInvoiceItems.productId))
      .where(and(...conditions))
      .groupBy(products.id, products.sku, products.name)
      .orderBy(desc(sql`sum(${salesInvoiceItems.lineTotalCents})`))
      .limit(10);
  });
}

export type StockMovementRow = {
  sku: string;
  name: string;
  qty: number;
  reason: string;
  note: string | null;
  refType: string | null;
  createdAt: Date;
};

export async function getStockMovementsBySku(
  orgId: string,
  sku: string,
  limit = 20,
): Promise<StockMovementRow[]> {
  return withTenant(orgId, (tx) =>
    tx
      .select({
        sku: products.sku,
        name: products.name,
        qty: stockMovements.qty,
        reason: stockMovements.reason,
        note: stockMovements.note,
        refType: stockMovements.refType,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(
        and(
          eq(stockMovements.orgId, orgId),
          sql`lower(${products.sku}) = lower(${sku})`,
        ),
      )
      .orderBy(desc(stockMovements.createdAt))
      .limit(Math.min(Math.max(limit, 1), 50)),
  );
}

export type InvoiceDetailResult = {
  number: string;
  customer: string;
  customerEmail: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotalCents: number;
  taxBps: number;
  totalCents: number;
  overdue: boolean;
  items: {
    sku: string;
    description: string;
    qty: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
};

export async function getInvoiceDetailByNumber(
  orgId: string,
  invoiceNumber: string,
): Promise<InvoiceDetailResult | null> {
  const today = todayIso();
  return withTenant(orgId, async (tx) => {
    const [invoice] = await tx
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        status: salesInvoices.status,
        issueDate: salesInvoices.issueDate,
        dueDate: salesInvoices.dueDate,
        subtotalCents: salesInvoices.subtotalCents,
        taxBps: salesInvoices.taxBps,
        totalCents: salesInvoices.totalCents,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(customers.id, salesInvoices.customerId))
      .where(
        sql`lower(${salesInvoices.number}) = lower(${invoiceNumber})`,
      )
      .limit(1);
    if (!invoice) return null;
    const items = await tx
      .select({
        sku: products.sku,
        description: salesInvoiceItems.description,
        qty: salesInvoiceItems.qty,
        unitPriceCents: salesInvoiceItems.unitPriceCents,
        lineTotalCents: salesInvoiceItems.lineTotalCents,
      })
      .from(salesInvoiceItems)
      .innerJoin(products, eq(products.id, salesInvoiceItems.productId))
      .where(eq(salesInvoiceItems.invoiceId, invoice.id))
      .orderBy(asc(salesInvoiceItems.id));
    return {
      number: invoice.number,
      customer: invoice.customerName,
      customerEmail: invoice.customerEmail,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotalCents: invoice.subtotalCents,
      taxBps: invoice.taxBps,
      totalCents: invoice.totalCents,
      overdue: isOverdue(invoice, today),
      items,
    };
  });
}

export type BusinessSummary = {
  period: "week" | "month" | "quarter";
  sinceIso: string;
  revenueCents: number;
  invoicesIssued: number;
  outstanding: { count: number; cents: number };
  overdue: { count: number; cents: number };
  lowStock: { sku: string; name: string; stockQty: number; minStock: number }[];
};

export async function getBusinessSummary(
  orgId: string,
  period: "week" | "month" | "quarter",
): Promise<BusinessSummary> {
  const days = period === "week" ? 7 : period === "month" ? 30 : 90;
  const today = todayIso();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString().slice(0, 10);

  return withTenant(orgId, async (tx) => {
    const [revenue] = await tx
      .select({
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesInvoices)
      .where(
        and(
          inArray(salesInvoices.status, ["paid", "sent"]),
          gte(salesInvoices.issueDate, sinceIso),
        ),
      );

    const [outstanding] = await tx
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.status, "sent"));

    const [overdueRow] = await tx
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${salesInvoices.totalCents}), 0)::float8`,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.status, "sent"),
          sql`${salesInvoices.dueDate} < ${today}`,
        ),
      );

    const lowStockItems = await tx
      .select({
        sku: products.sku,
        name: products.name,
        stockQty: products.stockQty,
        minStock: products.minStock,
      })
      .from(products)
      .where(sql`${products.stockQty} <= ${products.minStock}`)
      .orderBy(asc(products.stockQty))
      .limit(10);

    return {
      period,
      sinceIso,
      revenueCents: revenue.cents,
      invoicesIssued: revenue.count,
      outstanding: { count: outstanding.count, cents: outstanding.cents },
      overdue: { count: overdueRow.count, cents: overdueRow.cents },
      lowStock: lowStockItems,
    };
  });
}

export async function recordLlmUsage(input: {
  orgId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  steps: number;
  toolNames: string[];
  latencyMs: number;
}) {
  const { estimateCostMicroUsd } = await import("./llm-pricing");
  const costMicroUsd = estimateCostMicroUsd(
    input.model,
    input.promptTokens,
    input.completionTokens,
  );
  await withTenant(input.orgId, async (tx) => {
    await tx.insert(llmCallLogs).values({
      orgId: input.orgId,
      model: input.model,
      steps: input.steps,
      toolNames: input.toolNames,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      costMicroUsd,
      latencyMs: input.latencyMs,
    });
  });
}
