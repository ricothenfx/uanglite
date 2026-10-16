"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dba } from "@/db";
import { organizations } from "@/db/schema";
import { requireAuth, requireOwner } from "@/lib/auth";
import type { FormState } from "@/lib/form";

const orgSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  taxBps: z.coerce
    .number()
    .int()
    .min(0, "Tax cannot be negative.")
    .max(10_000, "Tax cannot exceed 100%."),
});

export async function updateOrgAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  requireOwner(auth);
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    taxBps: formData.get("taxBps"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await dba
    .update(organizations)
    .set({ name: parsed.data.name, taxBps: parsed.data.taxBps })
    .where(eq(organizations.id, auth.org.id));

  revalidatePath("/settings");
  return { ok: "Workspace updated." };
}
