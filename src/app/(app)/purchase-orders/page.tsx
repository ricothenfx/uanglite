import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";

export const metadata = { title: "Purchase Orders" };

export default function PurchaseOrdersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Restock lifecycle: draft → sent → received (stock in)."
        actions={
          <Link href="/purchase-orders/new">
            <Button size="sm">
              <Plus /> New purchase order
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
  const rows = await listPurchaseOrders(auth.org.id);

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Supplier</TH>
              <TH>Ordered</TH>
              <TH>Expected</TH>
              <TH className="text-right">Subtotal</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((po) => (
              <TR key={po.id}>
                <TD className="font-medium">
                  <Link
                    href={`/purchase-orders/${po.id}`}
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {po.number}
                  </Link>
                </TD>
                <TD>{po.supplierName}</TD>
                <TD>{po.orderDate}</TD>
                <TD>{po.expectedDate ?? "—"}</TD>
                <TD className="text-right">
                  {fmtMoney(po.subtotalCents, auth.org.currency)}
                </TD>
                <TD>
                  <StatusBadge status={po.status} />
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-zinc-500">
                  No purchase orders yet. The Pilot AI can draft them for you.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
