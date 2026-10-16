import "server-only";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { dba, isUuid } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { getSession } from "./session";

export type AuthContext = {
  user: { id: string; email: string; name: string };
  org: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    taxBps: number;
  };
  role: "owner" | "staff";
};

/**
 * Data Access Layer entry point. Resolves the caller's user, organization and
 * role from the encrypted session cookie, verifying the membership in the
 * database on every request — the cookie alone is never trusted for
 * authorization.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session.userId || !isUuid(session.userId)) return null;

  const rows = await dba
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      currency: organizations.currency,
      taxBps: organizations.taxBps,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(
      and(
        eq(memberships.userId, session.userId),
        isUuid(session.orgId ?? "")
          ? eq(memberships.orgId, session.orgId!)
          : undefined,
      ),
    );

  const row = rows[0];
  if (!row) return null;

  return {
    user: { id: row.userId, email: row.email, name: row.name },
    org: {
      id: row.orgId,
      name: row.orgName,
      slug: row.orgSlug,
      currency: row.currency,
      taxBps: row.taxBps,
    },
    role: row.role,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) {
    // A stale session cookie (user or tenant no longer exists, e.g. after a
    // demo reset) must not ping-pong: proxy optimistically redirects any
    // authed-looking request away from /login, while requireAuth bounces the
    // broken session back. The `stale` flag lets proxy render the login page.
    const hasSessionCookie = Boolean((await getSession()).userId);
    redirect(hasSessionCookie ? "/login?stale=1" : "/login");
  }
  return auth;
}

export function requireOwner(auth: AuthContext): void {
  if (auth.role !== "owner") {
    throw new Error("Only owners can perform this action.");
  }
}
