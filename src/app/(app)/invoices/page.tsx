import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";
import type { InvoiceStatus } from "@/lib/business";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.invoices };
}

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/invoices">) {
  const { invoices } = await getDictionary();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={invoices.title}
        description={invoices.description}
        actions={
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus /> {invoices.newInvoice}
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
  const [all, dict] = await Promise.all([
    listInvoices(auth.org.id),
    getDictionary(),
  ]);
  const { invoices, dashboard, status: statusLabels } = dict;
  const filtered =
    status === "all"
      ? all
      : status === "overdue"
        ? all.filter((i) => i.overdue)
        : all.filter((i) => i.status === (status as InvoiceStatus));

  const filters: { key: string; label: string }[] = [
    { key: "all", label: invoices.filterAll },
    { key: "draft", label: statusLabels.draft },
    { key: "sent", label: statusLabels.sent },
    { key: "overdue", label: statusLabels.overdue },
    { key: "paid", label: statusLabels.paid },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
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
                <TH>{dashboard.number}</TH>
                <TH>{dashboard.customer}</TH>
                <TH>{dashboard.issued}</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    {dashboard.due}
                    <InfoTip side="bottom" text={invoices.dueInfo} />
                  </span>
                </TH>
                <TH className="text-right">{dashboard.total}</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    {dashboard.status}
                    <InfoTip side="bottom" text={invoices.statusInfo} />
                  </span>
                </TH>
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
                    {invoices.noneInThisView}
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
