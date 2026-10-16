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
import { listPurchaseOrders } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.purchaseOrders };
}

export default async function PurchaseOrdersPage() {
  const { po } = await getDictionary();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={po.title}
        description={po.description}
        actions={
          <Link href="/purchase-orders/new">
            <Button size="sm">
              <Plus /> {po.newPo}
            </Button>
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <PoTable />
      </Suspense>
    </div>
  );
}

async function PoTable() {
  const auth = await requireAuth();
  const [rows, dict] = await Promise.all([
    listPurchaseOrders(auth.org.id),
    getDictionary(),
  ]);
  const { po } = dict;

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>{po.number}</TH>
              <TH>{po.supplier}</TH>
              <TH>{po.ordered}</TH>
              <TH>
                <span className="flex items-center gap-1">
                  {po.expected}
                  <InfoTip side="bottom" text={po.expectedInfo} />
                </span>
              </TH>
              <TH className="text-right">{po.subtotal}</TH>
              <TH>
                <span className="flex items-center gap-1">
                  {po.status}
                  <InfoTip side="bottom" text={po.statusInfo} />
                </span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="font-medium">
                  <Link
                    href={`/purchase-orders/${row.id}`}
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {row.number}
                  </Link>
                </TD>
                <TD>{row.supplierName}</TD>
                <TD>{row.orderDate}</TD>
                <TD>{row.expectedDate ?? "—"}</TD>
                <TD className="text-right">
                  {fmtMoney(row.subtotalCents, auth.org.currency)}
                </TD>
                <TD>
                  <StatusBadge status={row.status} />
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-zinc-500">
                  {po.noneYet}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
