import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listSuppliers } from "@/lib/queries";
import { getDictionary } from "@/lib/i18n/server";
import {
  DeleteContactButton,
  EditContactButton,
  NewContactButton,
} from "../contacts-ui";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.suppliers };
}

export default async function SuppliersPage() {
  const { contacts } = await getDictionary();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={contacts.suppliersTitle}
        description={contacts.suppliersDescription}
        actions={<NewContactButton kind="suppliers" />}
      />
      <Suspense fallback={<PageSkeleton />}>
        <SuppliersTable />
      </Suspense>
    </div>
  );
}

async function SuppliersTable() {
  const auth = await requireAuth();
  const [rows, dict] = await Promise.all([
    listSuppliers(auth.org.id),
    getDictionary(),
  ]);
  const c = dict.contacts;

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>{c.name}</TH>
              <TH>{c.email}</TH>
              <TH>{c.phone}</TH>
              <TH className="w-20" />
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="font-medium">{row.name}</TD>
                <TD className="text-zinc-500">{row.email ?? "—"}</TD>
                <TD className="text-zinc-500">{row.phone ?? "—"}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <EditContactButton kind="suppliers" contact={row} />
                    <DeleteContactButton kind="suppliers" id={row.id} name={row.name} />
                  </div>
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-zinc-500">
                  {c.noSuppliers}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
