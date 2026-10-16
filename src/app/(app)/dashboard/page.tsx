import { Suspense } from "react";
import { AlertTriangle, Banknote, Clock, PackageSearch } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { StatCard } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { fmtCompactMoney, fmtDate, fmtMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live overview of revenue, receivables and stock health."
      />
      <Suspense fallback={<PageSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const auth = await requireAuth();
  const data = await getDashboardData(auth.org.id);
  const currency = auth.org.currency;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={fmtCompactMoney(data.revenueMtdCents, currency)}
          hint="Invoices issued (paid + sent)"
          info="Sum of all invoice totals issued this calendar month, including paid and still-unpaid (sent) invoices. Drafts are excluded until you send them."
          icon={<Banknote className="size-4" />}
        />
        <StatCard
          label="Outstanding"
          value={fmtCompactMoney(data.outstanding.cents, currency)}
          hint={`${data.outstanding.count} sent invoice${data.outstanding.count === 1 ? "" : "s"} unpaid`}
          info="Money your customers still owe you: invoices that have been sent but not yet paid or voided. This is your accounts receivable."
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Overdue"
          value={String(data.overdue.count)}
          hint={fmtCompactMoney(data.overdue.cents, currency) + " past due date"}
          info="Sent invoices that passed their due date without full payment. A good shortlist for payment reminders — the Pilot AI can draft them for you."
          tone={data.overdue.count > 0 ? "danger" : "default"}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Low stock"
          value={String(data.lowStock.count)}
          hint="Products at or below minimum"
          info="Products whose quantity on hand reached the minimum stock level (the reorder point you set per product). Negative numbers mean overselling happened."
          tone={data.lowStock.count > 0 ? "warning" : "default"}
          icon={<PackageSearch className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Revenue — last 6 months
              <InfoTip text="Total invoiced value per month over the last six months, based on invoice issue date. Bars are drawn to scale against the busiest month." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={data.monthRevenue}
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Stock alerts
              <InfoTip text="Products currently at or below their minimum stock level. Treat these as your immediate restock list — receive a purchase order or adjust stock to clear an alert." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lowStock.items.length === 0 ? (
              <p className="text-xs text-zinc-500">
                All products are above their minimum stock level.
              </p>
            ) : (
              data.lowStock.items.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-800">
                      {item.sku} — {item.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      min {item.minStock}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${item.stockQty < 0 ? "text-red-600" : "text-amber-600"}`}
                  >
                    {item.stockQty}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Customer</TH>
                <TH>Issued</TH>
                <TH>Due</TH>
                <TH className="text-right">Total</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    Status
                    <InfoTip
                      side="bottom"
                      text="Invoice lifecycle: Draft → Sent → Paid (or Void). Sent invoices that pass their due date show as Overdue until paid."
                    />
                  </span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {data.recentInvoices.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium">
                    <a
                      href={`/invoices/${inv.id}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {inv.number}
                    </a>
                  </TD>
                  <TD>{inv.customerName}</TD>
                  <TD>{fmtDate(inv.issueDate)}</TD>
                  <TD>{fmtDate(inv.dueDate)}</TD>
                  <TD className="text-right">
                    {fmtMoney(inv.totalCents, currency)}
                  </TD>
                  <TD>
                    <StatusBadge status={inv.status} overdue={inv.overdue} />
                  </TD>
                </TR>
              ))}
              {data.recentInvoices.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-zinc-500">
                    No invoices yet.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; cents: number }[];
  currency: string;
}) {
  const months = last6Months();
  const values = months.map((m) => data.find((d) => d.month === m.key)?.cents ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div>
      <div className="flex h-44 items-end gap-3">
        {months.map((m, i) => {
          const height = Math.max(2, Math.round((values[i] / max) * 100));
          return (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">
                {fmtCompactMoney(values[i], currency)}
              </span>
              <div
                className="w-full rounded-t-md bg-emerald-500/90 transition-all"
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] font-medium text-zinc-500">
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function last6Months() {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d);
    dt.setMonth(d.getMonth() - i);
    out.push({
      key: dt.toISOString().slice(0, 7),
      label: dt.toLocaleDateString("en-SG", { month: "short" }),
    });
  }
  return out;
}
