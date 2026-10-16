"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dba } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { clearSession, writeSession } from "@/lib/session";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/form";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  orgName: z.string().min(2, "Company name must be at least 2 characters."),
  currency: z.enum(["SGD", "IDR", "MYR", "USD"]),
});

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password, orgName, currency } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await dba
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (existing.length > 0) {
    return { error: "This email is already registered. Try signing in." };
  }

  const passwordHash = await hash(password, 10);
  let slug = slugify(orgName);
  const slugTaken = await dba
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug));
  if (slugTaken.length > 0) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const created = await dba.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: orgName, slug, currency })
      .returning();
    const [user] = await tx
      .insert(users)
      .values({ name, email: normalizedEmail, passwordHash })
      .returning();
    await tx
      .insert(memberships)
      .values({ userId: user.id, orgId: org.id, role: "owner" });
    return { user, org };
  });

  await writeSession({
    userId: created.user.id,
    orgId: created.org.id,
    role: "owner",
    email: created.user.email,
    name: created.user.name,
  });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      email: z.email("Enter a valid email address."),
      password: z.string().min(1, "Password is required."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [user] = await dba
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  const [membership] = await dba
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) {
    return { error: "No workspace found for this account." };
  }

  await writeSession({
    userId: user.id,
    orgId: membership.orgId,
    role: membership.role,
    email: user.email,
    name: user.name,
  });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
