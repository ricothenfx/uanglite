import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { updatePoStatusAction } from "@/actions/purchase-orders";
import { requireAuth } from "@/lib/auth";
import { PO_TRANSITIONS } from "@/lib/business";
import { getPoDetail } from "@/lib/queries";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { getDictionary, getDateLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

export async function generateMetadata() {
  const { poDetail } = await getDictionary();
  return { title: poDetail.title };
}

export default async function PoDetailPage({
  params,
}: PageProps<"/purchase-orders/[id]">) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <PoDetail params={params} />
      </Suspense>
    </div>
  );
}

async function PoDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poId = id;
  const auth = await requireAuth();
  const [po, dict, dateLocale] = await Promise.all([
    getPoDetail(auth.org.id, poId),
    getDictionary(),
    getDateLocale(),
  ]);
  if (!po) notFound();
  const d = dict.poDetail;

  const currency = auth.org.currency;
  const nextStatuses = PO_TRANSITIONS[po.status];
  const actionLabels: Record<string, string> = {
    sent: d.markSent,
    received: d.receive,
    void: d.void,
  };

  return (
    <>
      <PageHeader
        title={po.number}
        description={`${po.supplierName} · ${interpolate(d.orderedOn, { date: fmtDate(po.orderDate, dateLocale) })}${po.expectedDate ? ` · ${interpolate(d.expectedOn, { date: fmtDate(po.expectedDate, dateLocale) })}` : ""}`}
        actions={
          <>
            <Link href="/purchase-orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft /> {d.allPos}
              </Button>
            </Link>
            {nextStatuses.map((status) => (
              <form key={status} action={updatePoStatusAction}>
                <input type="hidden" name="id" value={po.id} />
                <input type="hidden" name="status" value={status} />
                <Button
                  type="submit"
                  size="sm"
                  variant={status === "void" ? "outline" : "default"}
                >
                  {actionLabels[status] ?? status}
                </Button>
              </form>
            ))}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{d.items}</CardTitle>
            <StatusBadge status={po.status} />
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <THead>
                <TR>
                  <TH>{d.description}</TH>
                  <TH className="text-right">{d.qty}</TH>
                  <TH className="text-right">{d.unitCost}</TH>
                  <TH className="text-right">{d.total}</TH>
                </TR>
              </THead>
              <TBody>
                {po.items.map((item) => (
                  <TR key={item.id}>
                    <TD className="font-medium">{item.description}</TD>
                    <TD className="text-right">{item.qty}</TD>
                    <TD className="text-right">
                      {fmtMoney(item.unitCostCents, currency)}
                    </TD>
                    <TD className="text-right font-medium">
                      {fmtMoney(item.lineTotalCents, currency)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <span>{d.subtotal}</span>
              <span>{fmtMoney(po.subtotalCents, currency)}</span>
            </div>
            <div className="pt-3 text-xs text-zinc-500">
              <p>{interpolate(d.supplierLabel, { name: po.supplierName })}</p>
              {po.supplierEmail ? <p>{po.supplierEmail}</p> : null}
              {po.status === "received" ? (
                <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  {d.receivedNote}
                </p>
              ) : null}
              {po.notes ? (
                <p className="mt-2 rounded-lg bg-zinc-50 p-2 text-zinc-600">
                  {po.notes}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
