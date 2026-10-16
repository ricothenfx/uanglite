import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { getOrgMembers } from "@/lib/org-queries";
import { OrgForm } from "./org-form";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace profile used across invoices and the AI pilot."
      />
      <Suspense fallback={<PageSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const auth = await requireAuth();
  const members = await getOrgMembers(auth.org.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgForm
            name={auth.org.name}
            currency={auth.org.currency}
            taxBps={auth.org.taxBps}
            canEdit={auth.role === "owner"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    Role
                    <InfoTip
                      side="bottom"
                      text="Owners manage the workspace, members, currency and tax, and see AI costs. Staff can create products, invoices and POs but cannot change workspace settings."
                    />
                  </span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {members.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">{m.name}</TD>
                  <TD className="text-zinc-500">{m.email}</TD>
                  <TD>
                    <Badge variant={m.role === "owner" ? "success" : "default"}>
                      {m.role}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
