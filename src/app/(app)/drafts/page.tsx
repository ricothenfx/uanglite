import { Suspense } from "react";
import Link from "next/link";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { listAgentDrafts } from "@/lib/queries";
import { fmtDateTime } from "@/lib/utils";
import { getDictionary, getDateLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

export async function generateMetadata() {
  const { drafts } = await getDictionary();
  return { title: drafts.title };
}

type DraftPayload = {
  poNumber?: string;
  supplier?: string;
  lines?: { sku: string; qty: number; unitCostCents: number }[];
  subtotalCents?: number;
  to?: string;
  subject?: string;
  body?: string;
  invoiceNumber?: string;
};

export default async function DraftsPage() {
  const { drafts } = await getDictionary();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={drafts.title}
        description={drafts.description}
      />
      <Suspense fallback={<PageSkeleton />}>
        <DraftsList />
      </Suspense>
    </div>
  );
}

async function DraftsList() {
  const auth = await requireAuth();
  const [drafts, dict, dateLocale] = await Promise.all([
    listAgentDrafts(auth.org.id),
    getDictionary(),
    getDateLocale(),
  ]);
  const d = dict.drafts;

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500">
          {d.noneYet}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => {
        const payload = draft.payload as DraftPayload;
        return (
          <Card key={draft.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={draft.type === "purchase_order" ? "info" : "warning"}>
                  {draft.type === "purchase_order" ? d.purchaseOrder : d.paymentReminder}
                </Badge>
                <span className="text-xs text-zinc-400">
                  {fmtDateTime(draft.createdAt, dateLocale)}
                </span>
              </div>
              {draft.refId && draft.type === "purchase_order" ? (
                <Link
                  href={`/purchase-orders/${draft.refId}`}
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  {interpolate(d.openNumber, {
                    number: payload.poNumber ?? d.poFallback,
                  })}
                </Link>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-zinc-700">{draft.summary}</p>
            {payload.lines ? (
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                {payload.lines.map((l) => (
                  <li key={l.sku}>
                    {l.qty}× {l.sku}
                  </li>
                ))}
              </ul>
            ) : null}
            {payload.subject ? (
              <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                <p className="font-medium text-zinc-700">{payload.subject}</p>
                <p className="mt-1 whitespace-pre-wrap">{payload.body}</p>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
