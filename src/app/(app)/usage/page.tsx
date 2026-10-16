import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { getUsageData } from "@/lib/queries";
import { fmtDateTime, fmtQty } from "@/lib/utils";
import { getDictionary, getDateLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.usage };
}

export default async function UsagePage() {
  const { usage } = await getDictionary();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={usage.title}
        description={usage.description}
      />
      <Suspense fallback={<PageSkeleton />}>
        <UsageContent />
      </Suspense>
    </div>
  );
}

async function UsageContent() {
  const auth = await requireAuth();
  const [dict, dateLocale] = await Promise.all([getDictionary(), getDateLocale()]);
  const u = dict.usage;

  if (auth.role !== "owner") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500">
          {u.ownersOnly}
        </CardContent>
      </Card>
    );
  }

  const data = await getUsageData(auth.org.id);
  const totalCostUsd =
    data.byModel.reduce((sum, m) => sum + m.costMicroUsd, 0) / 1_000_000;
  const totalCalls = data.byModel.reduce((sum, m) => sum + m.calls, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-5 py-4">
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {u.spend}
            <InfoTip text={u.spendInfo} />
          </p>
          <p className="mt-1 text-2xl font-semibold">
            ${totalCostUsd.toFixed(4)}
          </p>
        </Card>
        <Card className="px-5 py-4">
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {u.requests}
            <InfoTip text={u.requestsInfo} />
          </p>
          <p className="mt-1 text-2xl font-semibold">{fmtQty(totalCalls)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {u.models}
            <InfoTip text={u.modelsInfo} />
          </p>
          <p className="mt-1 text-2xl font-semibold">{data.byModel.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{u.costByModel}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>{u.model}</TH>
                <TH className="text-right">{u.requestsCol}</TH>
                <TH className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    {u.estCost}
                    <InfoTip side="bottom" text={u.estCostInfo} />
                  </span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {data.byModel.map((m) => (
                <TR key={m.model}>
                  <TD className="font-mono text-xs">{m.model}</TD>
                  <TD className="text-right">{m.calls}</TD>
                  <TD className="text-right">
                    ${(m.costMicroUsd / 1_000_000).toFixed(4)}
                  </TD>
                </TR>
              ))}
              {data.byModel.length === 0 ? (
                <TR>
                  <TD colSpan={3} className="py-8 text-center text-zinc-500">
                    {u.noUsage}
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{u.recentCalls}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>{u.when}</TH>
                <TH>{u.model}</TH>
                <TH>{u.tools}</TH>
                <TH className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    {u.tokens}
                    <InfoTip side="bottom" text={u.tokensInfo} />
                  </span>
                </TH>
                <TH className="text-right">{u.latency}</TH>
              </TR>
            </THead>
            <TBody>
              {data.recent.map((log) => (
                <TR key={log.id}>
                  <TD>{fmtDateTime(log.createdAt, dateLocale)}</TD>
                  <TD className="font-mono text-xs">{log.model}</TD>
                  <TD className="text-xs text-zinc-500">
                    {log.toolNames.length > 0 ? log.toolNames.join(", ") : "—"}
                  </TD>
                  <TD className="text-right">
                    {log.promptTokens} / {log.completionTokens}
                  </TD>
                  <TD className="text-right">{log.latencyMs} ms</TD>
                </TR>
              ))}
              {data.recent.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-zinc-500">
                    {u.nothingLogged}
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
