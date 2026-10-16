"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { assertUuid, withTenant } from "@/db";
import {
  products,
  purchaseOrderItems,
  purchaseOrders,
  stockMovements,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  canTransitionPo,
  lineTotalCents,
  type PoStatus,
} from "@/lib/business";
import type { FormState } from "@/lib/form";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { todayIso } from "@/lib/utils";

function createSchema(messages: {
  selectSupplier: string;
  addLineItem: string;
}) {
  const itemSchema = z.object({
    productId: z.uuid(),
    qty: z.coerce.number().int().min(1),
    unitCostCents: z.coerce.number().int().min(0),
  });
  return z.object({
    supplierId: z.uuid(messages.selectSupplier),
    orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expectedDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
      .optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(itemSchema).min(1, messages.addLineItem),
  });
}

export async function createPoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const dict = await getDictionary();

  let rawItems: unknown = [];
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: dict.actions.invalidItems };
  }
  const parsed = createSchema({
    selectSupplier: dict.actions.selectSupplier,
    addLineItem: dict.actions.addLineItem,
  }).safeParse({
    supplierId: formData.get("supplierId"),
    orderDate: formData.get("orderDate") || todayIso(),
    expectedDate: formData.get("expectedDate") || "",
    notes: formData.get("notes") || undefined,
    items: rawItems,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supplierId, orderDate, expectedDate, notes, items } = parsed.data;

  const poId = await withTenant(auth.org.id, async (tx) => {
    const productRows = await tx
      .select({ id: products.id, sku: products.sku, name: products.name })
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
        throw new Error(dict.actions.productMissing);
      }
    }

    const lines = items.map((item) => {
      const product = byId.get(item.productId)!;
      return {
        productId: item.productId,
        description: `${product.sku} — ${product.name}`,
        qty: item.qty,
        unitCostCents: item.unitCostCents,
        lineTotalCents: lineTotalCents(item.qty, item.unitCostCents),
      };
    });
    const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);

    const [seq] = await tx
      .select({
        maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${purchaseOrders.number}, '^.*-', ''), '')::int), 0)`,
      })
      .from(purchaseOrders);
    const number = `PO-${new Date().getFullYear()}-${String(seq.maxNum + 1).padStart(4, "0")}`;

    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        orgId: auth.org.id,
        supplierId,
        number,
        status: "draft",
        orderDate,
        expectedDate: expectedDate || null,
        subtotalCents,
        notes: notes || null,
      })
      .returning({ id: purchaseOrders.id });

    await tx.insert(purchaseOrderItems).values(
      lines.map((line) => ({
        orgId: auth.org.id,
        poId: po.id,
        productId: line.productId,
        description: line.description,
        qty: line.qty,
        unitCostCents: line.unitCostCents,
        lineTotalCents: line.lineTotalCents,
      })),
    );

    return po.id;
  });

  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
  redirect(`/purchase-orders/${poId}`);
}

export async function updatePoStatusAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireAuth();
  const dict = await getDictionary();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const to = String(formData.get("status") ?? "") as PoStatus;

  await withTenant(auth.org.id, async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .for("update")
      .limit(1);
    if (!po) throw new Error(dict.actions.poNotFound);
    if (!canTransitionPo(po.status, to)) {
      throw new Error(
        interpolate(dict.actions.cannotTransition, {
          from: po.status,
          to,
        }),
      );
    }

    if (to === "received") {
      const items = await tx
        .select({
          productId: purchaseOrderItems.productId,
          qty: purchaseOrderItems.qty,
          unitCostCents: purchaseOrderItems.unitCostCents,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.poId, id));
      for (const item of items) {
        await tx
          .update(products)
          .set({
            stockQty: sql`${products.stockQty} + ${item.qty}`,
            costCents: item.unitCostCents,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
        await tx.insert(stockMovements).values({
          orgId: auth.org.id,
          productId: item.productId,
          qty: item.qty,
          reason: "purchase",
          refType: "purchase_order",
          refId: id,
          note: po.number,
        });
      }
    }

    await tx
      .update(purchaseOrders)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id));
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/products");
}
