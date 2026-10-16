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
import { getDictionary, getDateLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.dashboard };
}

export default async function DashboardPage() {
  const { dashboard } = await getDictionary();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={dashboard.title}
        description={dashboard.description}
      />
      <Suspense fallback={<PageSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const auth = await requireAuth();
  const [data, dict, dateLocale] = await Promise.all([
    getDashboardData(auth.org.id),
    getDictionary(),
    getDateLocale(),
  ]);
  const { dashboard } = dict;
  const currency = auth.org.currency;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dashboard.revenue}
          value={fmtCompactMoney(data.revenueMtdCents, currency)}
          hint={dashboard.revenueHint}
          info={dashboard.revenueInfo}
          icon={<Banknote className="size-4" />}
        />
        <StatCard
          label={dashboard.outstanding}
          value={fmtCompactMoney(data.outstanding.cents, currency)}
          hint={interpolate(
            data.outstanding.count === 1
              ? dashboard.outstandingHintOne
              : dashboard.outstandingHintOther,
            { count: data.outstanding.count },
          )}
          info={dashboard.outstandingInfo}
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label={dashboard.overdue}
          value={String(data.overdue.count)}
          hint={interpolate(dashboard.overdueHint, {
            amount: fmtCompactMoney(data.overdue.cents, currency),
          })}
          info={dashboard.overdueInfo}
          tone={data.overdue.count > 0 ? "danger" : "default"}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label={dashboard.lowStock}
          value={String(data.lowStock.count)}
          hint={dashboard.lowStockHint}
          info={dashboard.lowStockInfo}
          tone={data.lowStock.count > 0 ? "warning" : "default"}
          icon={<PackageSearch className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              {dashboard.revenueChart}
              <InfoTip text={dashboard.revenueChartInfo} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={data.monthRevenue}
              currency={currency}
              dateLocale={dateLocale}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              {dashboard.stockAlerts}
              <InfoTip text={dashboard.stockAlertsInfo} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lowStock.items.length === 0 ? (
              <p className="text-xs text-zinc-500">{dashboard.allStockHealthy}</p>
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
                      {interpolate(dashboard.min, { count: item.minStock })}
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
          <CardTitle>{dashboard.recentInvoices}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>{dashboard.number}</TH>
                <TH>{dashboard.customer}</TH>
                <TH>{dashboard.issued}</TH>
                <TH>{dashboard.due}</TH>
                <TH className="text-right">{dashboard.total}</TH>
                <TH>
                  <span className="flex items-center gap-1">
                    {dashboard.status}
                    <InfoTip side="bottom" text={dashboard.statusInfo} />
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
                  <TD>{fmtDate(inv.issueDate, dateLocale)}</TD>
                  <TD>{fmtDate(inv.dueDate, dateLocale)}</TD>
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
                    {dashboard.noInvoices}
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
  dateLocale,
}: {
  data: { month: string; cents: number }[];
  currency: string;
  dateLocale: string;
}) {
  const months = last6Months(dateLocale);
  const values = months.map((m) => data.find((d) => d.month === m.key)?.cents ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div>
      {/* column height minus the two text labels and gaps: bars scale inside
          the space that is actually available, so flex shrink cannot clip them */}
      <div className="flex h-44 items-end gap-3">
        {months.map((m, i) => {
          const ratio = values[i] / max;
          return (
            <div
              key={m.key}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-[10px] text-zinc-400">
                {fmtCompactMoney(values[i], currency)}
              </span>
              <div
                className="w-full shrink-0 rounded-t-md bg-emerald-500/90 transition-all"
                style={{
                  height: `max(2px, calc((100% - 2.75rem) * ${ratio}))`,
                }}
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

function last6Months(locale: string) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d);
    dt.setMonth(d.getMonth() - i);
    out.push({
      key: dt.toISOString().slice(0, 7),
      label: dt.toLocaleDateString(locale, { month: "short" }),
    });
  }
  return out;
}
