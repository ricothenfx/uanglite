import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import {
  agentDrafts,
  customers,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesInvoices,
  suppliers,
} from "@/db/schema";
import { lineTotalCents } from "./business";
import { todayIso } from "./utils";

export type DraftPoResult =
  | {
      ok: true;
      poNumber: string;
      poId: string;
      supplier: string;
      lines: { sku: string; name: string; qty: number; unitCostCents: number; lineTotalCents: number }[];
      subtotalCents: number;
    }
  | { ok: false; error: string; matches?: string[] };

export async function createDraftPurchaseOrder(
  orgId: string,
  input: {
    supplierName: string;
    items: { sku: string; quantity: number }[];
    note?: string;
    userId?: string;
  },
): Promise<DraftPoResult> {
  return withTenant(orgId, async (tx) => {
    const matchingSuppliers = await tx
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(
        sql`lower(${suppliers.name}) like ${"%" + input.supplierName.toLowerCase() + "%"}`,
      );
    if (matchingSuppliers.length === 0) {
      return {
        ok: false,
        error: `No supplier found matching "${input.supplierName}".`,
      };
    }
    if (matchingSuppliers.length > 1) {
      return {
        ok: false,
        error: `Multiple suppliers match "${input.supplierName}". Ask the user to disambiguate.`,
        matches: matchingSuppliers.map((s) => s.name),
      };
    }
    const supplier = matchingSuppliers[0];

    const skus = input.items.map((i) => i.sku);
    const productRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        costCents: products.costCents,
      })
      .from(products)
      .where(
        inArray(
          sql`lower(${products.sku})`,
          skus.map((s) => s.toLowerCase()),
        ),
      );
    const bySku = new Map(productRows.map((p) => [p.sku.toLowerCase(), p]));
    const missing = skus.filter((sku) => !bySku.has(sku.toLowerCase()));
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Unknown SKUs: ${missing.join(", ")}. Use query_stock to find exact SKUs.`,
      };
    }

    const lines = input.items.map((item) => {
      const product = bySku.get(item.sku.toLowerCase())!;
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: item.quantity,
        unitCostCents: product.costCents,
        lineTotalCents: lineTotalCents(item.quantity, product.costCents),
      };
    });
    const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);

    const [seq] = await tx
      .select({
        maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${purchaseOrders.number}, '^.*-', ''), '')::int), 0)`,
      })
      .from(purchaseOrders);
    const poNumber = `PO-${new Date().getFullYear()}-${String(seq.maxNum + 1).padStart(4, "0")}`;

    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        orgId,
        supplierId: supplier.id,
        number: poNumber,
        status: "draft",
        orderDate: todayIso(),
        subtotalCents,
        notes: input.note
          ? `${input.note} (drafted by Pilot AI)`
          : "Drafted by Pilot AI",
      })
      .returning({ id: purchaseOrders.id });

    await tx.insert(purchaseOrderItems).values(
      lines.map((line) => ({
        orgId,
        poId: po.id,
        productId: line.productId,
        description: `${line.sku} — ${line.name}`,
        qty: line.qty,
        unitCostCents: line.unitCostCents,
        lineTotalCents: line.lineTotalCents,
      })),
    );

    await tx.insert(agentDrafts).values({
      orgId,
      type: "purchase_order",
      summary: `Draft PO ${poNumber} for ${supplier.name}: ${lines
        .map((l) => `${l.qty}× ${l.sku}`)
        .join(", ")} (subtotal ${(subtotalCents / 100).toFixed(2)})`,
      payload: {
        poNumber,
        supplier: supplier.name,
        lines: lines.map((l) => ({
          sku: l.sku,
          qty: l.qty,
          unitCostCents: l.unitCostCents,
        })),
        subtotalCents,
      },
      refId: po.id,
      createdBy: input.userId ?? null,
    });

    return {
      ok: true,
      poNumber,
      poId: po.id,
      supplier: supplier.name,
      lines: lines.map(({ sku, name, qty, unitCostCents, lineTotalCents: total }) => ({
        sku,
        name,
        qty,
        unitCostCents,
        lineTotalCents: total,
      })),
      subtotalCents,
    };
  });
}

export type ReminderDraftResult =
  | { ok: false; error: string; invoiceStatus?: string; dueDate?: string }
  | {
      ok: true;
      invoiceNumber: string;
      customer: string;
      to: string | null;
      subject: string;
      body: string;
    };

export async function createPaymentReminderDraft(
  orgId: string,
  input: { invoiceNumber: string; userId?: string },
): Promise<ReminderDraftResult> {
  const today = todayIso();
  return withTenant(orgId, async (tx) => {
    const [row] = await tx
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        status: salesInvoices.status,
        dueDate: salesInvoices.dueDate,
        totalCents: salesInvoices.totalCents,
        taxBps: salesInvoices.taxBps,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(customers.id, salesInvoices.customerId))
      .where(
        and(
          eq(salesInvoices.orgId, orgId),
          sql`lower(${salesInvoices.number}) = lower(${input.invoiceNumber})`,
        ),
      )
      .limit(1);

    if (!row) {
      return { ok: false, error: `Invoice ${input.invoiceNumber} not found.` };
    }
    if (row.status === "paid") {
      return {
        ok: false,
        error: `Invoice ${row.number} is already paid.`,
        invoiceStatus: row.status,
        dueDate: row.dueDate,
      };
    }
    if (row.status !== "sent") {
      return {
        ok: false,
        error: `Invoice ${row.number} is still a draft — it has never been sent, so no reminder makes sense.`,
        invoiceStatus: row.status,
        dueDate: row.dueDate,
      };
    }
    if (row.dueDate >= today) {
      return {
        ok: false,
        error: `Invoice ${row.number} is not overdue yet (due ${row.dueDate}).`,
        invoiceStatus: row.status,
        dueDate: row.dueDate,
      };
    }

    const daysLate = Math.round(
      (new Date(today + "T00:00:00Z").getTime() -
        new Date(row.dueDate + "T00:00:00Z").getTime()) /
        86_400_000,
    );
    const subject = `Payment reminder: invoice ${row.number} (${daysLate} day${daysLate === 1 ? "" : "s"} overdue)`;
    const body = [
      `Dear ${row.customerName},`,
      "",
      `Our records show that invoice ${row.number} is ${daysLate} day${daysLate === 1 ? "" : "s"} past its due date of ${row.dueDate}. The outstanding amount is ${(row.totalCents / 100).toFixed(2)} (tax included).`,
      "",
      "If the payment has already been arranged, please disregard this message. Otherwise we would appreciate it if you could settle the invoice at your earliest convenience.",
      "",
      "Kind regards,",
      "UangLite on behalf of the finance team",
    ].join("\n");

    await tx.insert(agentDrafts).values({
      orgId,
      type: "payment_reminder",
      summary: `Payment reminder draft for ${row.number} (${row.customerName}, ${daysLate}d overdue)`,
      payload: {
        invoiceNumber: row.number,
        to: row.customerEmail,
        subject,
        body,
      },
      refId: row.id,
      createdBy: input.userId ?? null,
    });

    return {
      ok: true,
      invoiceNumber: row.number,
      customer: row.customerName,
      to: row.customerEmail,
      subject,
      body,
    };
  });
}
