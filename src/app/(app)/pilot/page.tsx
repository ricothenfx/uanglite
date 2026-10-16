import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { requireAuth } from "@/lib/auth";
import { WRITE_TOOLS } from "@/ai/tools";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { PilotChat } from "./chat";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.pilot };
}

export default async function PilotPage() {
  const { pilot } = await getDictionary();
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <PageHeader
          title={pilot.title}
          description={pilot.description}
        />
        <Suspense fallback={<PageSkeleton />}>
          <PilotContent />
        </Suspense>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              {pilot.canDo}
              <InfoTip text={pilot.canDoInfo} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p>
              <span className="font-medium text-zinc-800">{pilot.readLabel}</span>{" "}
              {pilot.readBody}
            </p>
            <p className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-zinc-800">{pilot.writeLabel}</span>{" "}
              {pilot.writeBody}
              <InfoTip text={pilot.writeInfo} side="bottom" />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              {pilot.safety}
              <InfoTip text={pilot.safetyInfo} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <p className="flex flex-wrap items-center gap-1">
              {interpolate(pilot.approvalTools, { tools: WRITE_TOOLS.join(", ") })}
              <InfoTip
                text={pilot.approvalToolsInfo}
                side="bottom"
              />
            </p>
            <p>{pilot.grounded}</p>
            <p>{pilot.logged}</p>
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
