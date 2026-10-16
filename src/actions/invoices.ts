"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { assertUuid, withTenant } from "@/db";
import {
  products,
  salesInvoiceItems,
  salesInvoices,
  stockMovements,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  canTransitionInvoice,
  computeTotals,
  lineTotalCents,
  type InvoiceStatus,
} from "@/lib/business";
import type { FormState } from "@/lib/form";
import { todayIso } from "@/lib/utils";

const itemSchema = z.object({
  productId: z.uuid(),
  qty: z.coerce.number().int().min(1),
  unitPriceCents: z.coerce.number().int().min(0),
});

const createSchema = z.object({
  customerId: z.uuid("Select a customer."),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid issue date."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date."),
  notes: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1, "Add at least one line item."),
});

export async function createInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();

  let rawItems: unknown = [];
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Invalid line items payload." };
  }
  const parsed = createSchema.safeParse({
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate") || todayIso(),
    dueDate: formData.get("dueDate") || todayIso(),
    notes: formData.get("notes") || undefined,
    items: rawItems,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { customerId, issueDate, dueDate, notes, items } = parsed.data;

  const invoiceId = await withTenant(auth.org.id, async (tx) => {
    const productRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(
        and(
          eq(products.orgId, auth.org.id),
          inArray(
            products.id,
            items.map((i) => i.productId),
          ),
        ),
      );
    const byId = new Map(productRows.map((p) => [p.id, p]));
    for (const item of items) {
      if (!byId.has(item.productId)) {
        throw new Error("One of the selected products no longer exists.");
      }
    }

    const lines = items.map((item) => {
      const product = byId.get(item.productId)!;
      return {
        productId: item.productId,
        description: `${product.sku} — ${product.name}`,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: lineTotalCents(item.qty, item.unitPriceCents),
      };
    });
    const totals = computeTotals(lines, auth.org.taxBps);

    const [seq] = await tx
      .select({
        maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${salesInvoices.number}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(salesInvoices);
    const number = `INV-${new Date().getFullYear()}-${String(seq.maxNum + 1).padStart(4, "0")}`;

    const [invoice] = await tx
      .insert(salesInvoices)
      .values({
        orgId: auth.org.id,
        customerId,
        number,
        status: "draft",
        issueDate,
        dueDate,
        subtotalCents: totals.subtotalCents,
        taxBps: auth.org.taxBps,
        totalCents: totals.totalCents,
        notes: notes || null,
      })
      .returning({ id: salesInvoices.id });

    await tx.insert(salesInvoiceItems).values(
      lines.map((line) => ({
        orgId: auth.org.id,
        invoiceId: invoice.id,
        productId: line.productId,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })),
    );

    return invoice.id;
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceStatusAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const to = String(formData.get("status") ?? "") as InvoiceStatus;

  await withTenant(auth.org.id, async (tx) => {
    const [invoice] = await tx
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.id, id))
      .for("update")
      .limit(1);
    if (!invoice) throw new Error("Invoice not found.");
    if (!canTransitionInvoice(invoice.status, to)) {
      throw new Error(`Cannot change status from ${invoice.status} to ${to}.`);
    }

    if (to === "sent") {
      const items = await tx
        .select({
          productId: salesInvoiceItems.productId,
          qty: salesInvoiceItems.qty,
        })
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, id));
      for (const item of items) {
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} - ${item.qty}` })
          .where(eq(products.id, item.productId));
        await tx.insert(stockMovements).values({
          orgId: auth.org.id,
          productId: item.productId,
          qty: -item.qty,
          reason: "sale",
          refType: "invoice",
          refId: id,
          note: invoice.number,
        });
      }
    }

    await tx
      .update(salesInvoices)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(salesInvoices.id, id));
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
}
