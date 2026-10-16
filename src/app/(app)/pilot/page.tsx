import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <CardTitle>What it can do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p>
              <span className="font-medium text-zinc-800">Read:</span> stock
              lookups, invoice search, business KPIs, anomaly scans.
            </p>
            <p>
              <span className="font-medium text-zinc-800">Write (draft-only):</span>{" "}
              restock POs and payment reminder emails — each one pauses for your
              approval before it is created.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p>Write tools requiring approval: {WRITE_TOOLS.join(", ")}.</p>
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
