import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { getUsageData } from "@/lib/queries";
import { fmtDateTime, fmtQty } from "@/lib/utils";

export const metadata = { title: "AI Usage" };

export default function UsagePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="AI Usage"
        description="Token consumption and estimated cost of the Pilot, per tenant."
      />
      <Suspense fallback={<PageSkeleton />}>
        <UsageContent />
      </Suspense>
    </div>
  );
}

async function UsageContent() {
  const auth = await requireAuth();
  if (auth.role !== "owner") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500">
          Only workspace owners can view AI usage and costs.
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
          <p className="text-xs text-zinc-500">Estimated spend (all time)</p>
          <p className="mt-1 text-2xl font-semibold">
            ${totalCostUsd.toFixed(4)}
          </p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs text-zinc-500">Agent requests</p>
          <p className="mt-1 text-2xl font-semibold">{fmtQty(totalCalls)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs text-zinc-500">Models used</p>
          <p className="mt-1 text-2xl font-semibold">{data.byModel.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost by model</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>Model</TH>
                <TH className="text-right">Requests</TH>
                <TH className="text-right">Est. cost</TH>
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
                    No AI usage recorded yet. Ask the Pilot something.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Model</TH>
                <TH>Tools</TH>
                <TH className="text-right">Tokens in/out</TH>
                <TH className="text-right">Latency</TH>
              </TR>
            </THead>
            <TBody>
              {data.recent.map((log) => (
                <TR key={log.id}>
                  <TD>{fmtDateTime(log.createdAt)}</TD>
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
                    Nothing logged yet.
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
