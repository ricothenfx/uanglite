"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { assertUuid, withTenant } from "@/db";
import { customers, salesInvoices, suppliers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import type { FormState } from "@/lib/form";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z
    .union([z.email("Enter a valid email address."), z.literal("")])
    .optional(),
  phone: z.string().trim().max(40).optional(),
});

function contactFields(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
  });
}

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const parsed = contactFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await withTenant(auth.org.id, async (tx) => {
    await tx.insert(customers).values({
      orgId: auth.org.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    });
  });
  revalidatePath("/customers");
  return { ok: `Customer ${parsed.data.name} added.` };
}

export async function updateCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const parsed = contactFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const updated = await withTenant(auth.org.id, async (tx) => {
    const [row] = await tx
      .update(customers)
      .set({
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      })
      .where(eq(customers.id, id))
      .returning({ id: customers.id });
    return row ?? null;
  });
  if (!updated) return { error: "Customer not found." };
  revalidatePath("/customers");
  return { ok: "Customer updated." };
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  await withTenant(auth.org.id, async (tx) => {
    const [referenced] = await tx
      .select({ id: salesInvoices.id })
      .from(salesInvoices)
      .where(eq(salesInvoices.customerId, id))
      .limit(1);
    if (referenced) {
      throw new Error("Customer has invoices and cannot be deleted.");
    }
    await tx.delete(customers).where(eq(customers.id, id));
  });
  revalidatePath("/customers");
}

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const parsed = contactFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await withTenant(auth.org.id, async (tx) => {
    await tx.insert(suppliers).values({
      orgId: auth.org.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    });
  });
  revalidatePath("/suppliers");
  return { ok: `Supplier ${parsed.data.name} added.` };
}

export async function updateSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  const parsed = contactFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const updated = await withTenant(auth.org.id, async (tx) => {
    const [row] = await tx
      .update(suppliers)
      .set({
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      })
      .where(eq(suppliers.id, id))
      .returning({ id: suppliers.id });
    return row ?? null;
  });
  if (!updated) return { error: "Supplier not found." };
  revalidatePath("/suppliers");
  return { ok: "Supplier updated." };
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  const id = assertUuid(String(formData.get("id") ?? ""));
  await withTenant(auth.org.id, async (tx) => {
    const [used] = await tx.execute(
      sql`select exists(select 1 from purchase_orders where supplier_id = ${id}) as used`,
    );
    if (used.used) {
      throw new Error("Supplier has purchase orders and cannot be deleted.");
    }
    await tx.delete(suppliers).where(eq(suppliers.id, id));
  });
  revalidatePath("/suppliers");
}
