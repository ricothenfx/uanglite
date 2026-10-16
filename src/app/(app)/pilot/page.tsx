import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { requireAuth } from "@/lib/auth";
import { WRITE_TOOLS } from "@/ai/tools";
import { PilotChat } from "./chat";

export const metadata = { title: "Pilot AI" };

export default function PilotPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <PageHeader
          title="Pilot AI"
          description="Grounded agent for your workspace. Read tools run live; write tools are draft-only with your approval."
        />
        <Suspense fallback={<PageSkeleton />}>
          <PilotContent />
        </Suspense>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              What it can do
              <InfoTip text="Read tools query your workspace directly in Postgres and answer with real numbers. Write tools never touch live data: they only prepare a draft for you to review." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p>
              <span className="font-medium text-zinc-800">Read:</span> stock
              lookups, invoice search, business KPIs, anomaly scans.
            </p>
            <p className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-zinc-800">Write (draft-only):</span>
              restock POs and payment reminder emails — each one pauses for your
              approval before it is created.
              <InfoTip
                text="Draft-only means the agent cannot modify data by itself. It proposes, you approve: approved drafts appear as a real draft PO or reminder you can still edit or discard."
                side="bottom"
              />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Safety model
              <InfoTip text="Defense in depth: Row-Level Security confines every query to your tenant, write tools are draft-only, and every model call is logged with its cost." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p className="flex flex-wrap items-center gap-1">
              Write tools requiring approval: {WRITE_TOOLS.join(", ")}.
              <InfoTip
                text="These tools stop mid-run and render Approve / Decline buttons in the chat. Nothing is created until you click Approve — the decision is sent back to the agent to continue."
                side="bottom"
              />
            </p>
            <p>
              Every answer is grounded in tool results from this tenant only
              (enforced by Postgres Row-Level Security). Numbers are never
              hallucinated — if a tool cannot answer, the pilot says so.
            </p>
            <p>
              All model calls are logged with token usage and estimated cost on
              the AI Usage page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function PilotContent() {
  const auth = await requireAuth();

  return <PilotChat currency={auth.org.currency} />;
}
