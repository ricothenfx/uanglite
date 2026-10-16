import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/business";

export const metadata = { title: "Invoices" };

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
];

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/invoices">) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Invoices"
        description="Billing lifecycle: draft → sent → paid."
        actions={
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus /> New invoice
            </Button>
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <InvoicesTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InvoicesTable({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";

  const auth = await requireAuth();
  const all = await listInvoices(auth.org.id);
  const filtered =
    status === "all"
      ? all
      : status === "overdue"
        ? all.filter((i) => i.overdue)
        : all.filter((i) => i.status === (status as InvoiceStatus));

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === f.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Customer</TH>
                <TH>Issued</TH>
                <TH>Due</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </TD>
                  <TD>{inv.customerName}</TD>
                  <TD>{inv.issueDate}</TD>
                  <TD>{inv.dueDate}</TD>
                  <TD className="text-right">
                    {fmtMoney(inv.totalCents, auth.org.currency)}
                  </TD>
                  <TD>
                    <StatusBadge status={inv.status} overdue={inv.overdue} />
                  </TD>
                </TR>
              ))}
              {filtered.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-10 text-center text-zinc-500">
                    No invoices in this view.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
