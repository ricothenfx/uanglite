import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { updateInvoiceStatusAction } from "@/actions/invoices";
import { requireAuth } from "@/lib/auth";
import { INVOICE_TRANSITIONS } from "@/lib/business";
import { getInvoiceDetail } from "@/lib/queries";
import { fmtDate, fmtMoney } from "@/lib/utils";

export const metadata = { title: "Invoice" };

const ACTION_LABELS: Record<string, string> = {
  sent: "Mark as sent",
  paid: "Mark as paid",
  void: "Void invoice",
};

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[id]">) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <InvoiceDetail params={params} />
      </Suspense>
    </div>
  );
}

async function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = id;
  const auth = await requireAuth();
  const invoice = await getInvoiceDetail(auth.org.id, invoiceId);
  if (!invoice) notFound();

  const currency = auth.org.currency;
  const nextStatuses = INVOICE_TRANSITIONS[invoice.status];

  return (
    <>
      <PageHeader
        title={invoice.number}
        description={`${invoice.customerName} · issued ${fmtDate(invoice.issueDate)} · due ${fmtDate(invoice.dueDate)}`}
        actions={
          <>
            <Link href="/invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft /> All invoices
              </Button>
            </Link>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <FileDown /> PDF
              </Button>
            </a>
            {nextStatuses.map((status) => (
              <form key={status} action={updateInvoiceStatusAction}>
                <input type="hidden" name="id" value={invoice.id} />
                <input type="hidden" name="status" value={status} />
                <Button
                  type="submit"
                  size="sm"
                  variant={status === "void" ? "outline" : "default"}
                >
                  {ACTION_LABELS[status] ?? status}
                </Button>
              </form>
            ))}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
            <StatusBadge status={invoice.status} overdue={invoice.status === "sent" && invoice.dueDate < todayIso()} />
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <THead>
                <TR>
                  <TH>Description</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Unit price</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {invoice.items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <span className="font-medium">{item.description}</span>
                    </TD>
                    <TD className="text-right">{item.qty}</TD>
                    <TD className="text-right">
                      {fmtMoney(item.unitPriceCents, currency)}
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
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{fmtMoney(invoice.subtotalCents, currency)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Tax ({(invoice.taxBps / 100).toFixed(1)}%)</span>
              <span>
                {fmtMoney(invoice.totalCents - invoice.subtotalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{fmtMoney(invoice.totalCents, currency)}</span>
            </div>
            <div className="pt-3 text-xs text-zinc-500">
              <p>Billed to: {invoice.customerName}</p>
              {invoice.customerEmail ? <p>{invoice.customerEmail}</p> : null}
              {invoice.notes ? (
                <p className="mt-2 rounded-lg bg-zinc-50 p-2 text-zinc-600">
                  {invoice.notes}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
