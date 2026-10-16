import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listCustomers } from "@/lib/queries";
import {
  DeleteContactButton,
  EditContactButton,
  NewContactButton,
} from "../contacts-ui";

export const metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Customers"
        description="People and companies you invoice."
        actions={<NewContactButton kind="customers" />}
      />
      <Suspense fallback={<PageSkeleton />}>
        <CustomersTable />
      </Suspense>
    </div>
  );
}

async function CustomersTable() {
  const auth = await requireAuth();
  const rows = await listCustomers(auth.org.id);

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
            {rows.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD className="text-zinc-500">{c.email ?? "—"}</TD>
                <TD className="text-zinc-500">{c.phone ?? "—"}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <EditContactButton kind="customers" contact={c} />
                    <DeleteContactButton kind="customers" id={c.id} name={c.name} />
                  </div>
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-zinc-500">
                  No customers yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
