import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { getOrgMembers } from "@/lib/org-queries";
import { getDictionary } from "@/lib/i18n/server";
import { OrgForm } from "./org-form";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.settings };
}

export default async function SettingsPage() {
  const { settings } = await getDictionary();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={settings.title}
        description={settings.description}
      />
      <Suspense fallback={<PageSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const auth = await requireAuth();
  const [members, dict] = await Promise.all([
    getOrgMembers(auth.org.id),
    getDictionary(),
  ]);
  const { settings, role } = dict;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{settings.workspace}</CardTitle>
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
          <CardTitle>{settings.members}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>{dict.contacts.name}</TH>
                <TH>{dict.contacts.email}</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    {settings.roleName}
                    <InfoTip side="bottom" text={settings.roleInfo} />
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
                      {role[m.role as keyof typeof role] ?? m.role}
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
