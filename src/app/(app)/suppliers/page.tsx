import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listSuppliers } from "@/lib/queries";
import {
  DeleteContactButton,
  EditContactButton,
  NewContactButton,
} from "../contacts-ui";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Suppliers"
        description="Where your stock comes from."
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
  const rows = await listSuppliers(auth.org.id);

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH className="w-20" />
            </TR>
          </THead>
          <TBody>
            {rows.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD className="text-zinc-500">{s.email ?? "—"}</TD>
                <TD className="text-zinc-500">{s.phone ?? "—"}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <EditContactButton kind="suppliers" contact={s} />
                    <DeleteContactButton kind="suppliers" id={s.id} name={s.name} />
                  </div>
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-zinc-500">
                  No suppliers yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
