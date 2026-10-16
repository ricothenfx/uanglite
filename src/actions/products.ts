"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { assertUuid, withTenant } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { centsFromInput, type FormState } from "@/lib/form";

const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required.").max(40),
  name: z.string().trim().min(1, "Name is required.").max(120),
  category: z.string().trim().max(60).default("general"),
  minStock: z.coerce.number().int().min(0),
});

function productFields(formData: FormData) {
  return productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    category: formData.get("category") || "general",
    minStock: formData.get("minStock") || "0",
  });
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const parsed = productFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const priceCents = centsFromInput(formData.get("price"));
  const costRaw = String(formData.get("cost") ?? "").trim();
  const costCents = costRaw === "" ? 0 : centsFromInput(costRaw);
  const openingQty = Number.parseInt(
    String(formData.get("openingQty") ?? "0"),
    10,
  );
  if (Number.isNaN(priceCents)) return { error: "Invalid selling price." };
  if (Number.isNaN(costCents)) return { error: "Invalid cost price." };
  if (!Number.isFinite(openingQty) || openingQty < 0) {
    return { error: "Opening stock must be a non-negative number." };
  }

  const { sku, name, category, minStock } = parsed.data;
  try {
    await withTenant(auth.org.id, async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          orgId: auth.org.id,
          sku,
          name,
          category,
          priceCents,
          costCents,
          minStock,
          stockQty: 0,
        })
        .returning();
      if (openingQty > 0) {
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${openingQty}` })
          .where(eq(products.id, product.id));
        await tx.insert(stockMovements).values({
          orgId: auth.org.id,
          productId: product.id,
          qty: openingQty,
          reason: "adjustment",
          note: "Opening stock",
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("products_org_sku")) {
      return { error: `SKU "${sku}" already exists.` };
    }
    throw err;
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: `Product ${sku} created.` };
}

export async function updateProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const parsed = productFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const priceCents = centsFromInput(formData.get("price"));
  const costRaw = String(formData.get("cost") ?? "").trim();
  const costCents = costRaw === "" ? 0 : centsFromInput(costRaw);
  if (Number.isNaN(priceCents)) return { error: "Invalid selling price." };
  if (Number.isNaN(costCents)) return { error: "Invalid cost price." };

  const { sku, name, category, minStock } = parsed.data;
  const updated = await withTenant(auth.org.id, async (tx) => {
    const [row] = await tx
      .update(products)
      .set({
        sku,
        name,
        category,
        priceCents,
        costCents,
        minStock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return row ?? null;
  });
  if (!updated) return { error: "Product not found." };

  revalidatePath("/products");
  return { ok: `Product ${sku} updated.` };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  await withTenant(auth.org.id, async (tx) => {
    const [used] = await tx.execute(
      sql`select exists(select 1 from sales_invoice_items where product_id = ${id}) or exists(select 1 from purchase_order_items where product_id = ${id}) as used`,
    );
    if (used.used) {
      throw new Error(
        "Product is referenced by invoices or purchase orders and cannot be deleted. Deactivate it instead.",
      );
    }
    await tx.delete(products).where(eq(products.id, id));
  });
  revalidatePath("/products");
}

export async function adjustStockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const delta = Number.parseInt(String(formData.get("delta") ?? ""), 10);
  const note = String(formData.get("note") ?? "").slice(0, 200);
  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Adjustment must be a non-zero number." };
  }

  const result = await withTenant(auth.org.id, async (tx) => {
    const [product] = await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${delta}`, updatedAt: new Date() })
      .where(and(eq(products.id, id)))
      .returning({ sku: products.sku, stockQty: products.stockQty });
    if (!product) return null;
    await tx.insert(stockMovements).values({
      orgId: auth.org.id,
      productId: id,
      qty: delta,
      reason: "adjustment",
      note: note || undefined,
    });
    return product;
  });
  if (!result) return { error: "Product not found." };

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return {
    ok: `Stock for ${result.sku} adjusted. New quantity: ${result.stockQty}.`,
  };
}

export async function toggleProductActiveAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  await withTenant(auth.org.id, async (tx) => {
    await tx
      .update(products)
      .set({ active: sql`not ${products.active}`, updatedAt: new Date() })
      .where(eq(products.id, id));
  });
  revalidatePath("/products");
}
