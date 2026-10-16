import { dba } from "@/db";
import { memberships, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getOrgMembers(orgId: string) {
  return dba
    .select({
      id: memberships.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))
    .orderBy(asc(memberships.createdAt));
}
