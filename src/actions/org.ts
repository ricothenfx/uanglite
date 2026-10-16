"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dba } from "@/db";
import { organizations } from "@/db/schema";
import { requireAuth, requireOwner } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import type { FormState } from "@/lib/form";

export async function updateOrgAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuth();
  requireOwner(auth);
  const dict = await getDictionary();
  const orgSchema = z.object({
    name: z.string().trim().min(2, dict.auth.nameMinLength),
    taxBps: z.coerce
      .number()
      .int()
      .min(0, dict.actions.taxNegative)
      .max(10_000, dict.actions.taxMax),
  });
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
  return { ok: dict.actions.orgUpdated };
}
