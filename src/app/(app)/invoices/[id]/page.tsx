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
import { getDictionary, getDateLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

export async function generateMetadata() {
  const { invoiceDetail } = await getDictionary();
  return { title: invoiceDetail.title };
}

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
  const [invoice, dict, dateLocale] = await Promise.all([
    getInvoiceDetail(auth.org.id, invoiceId),
    getDictionary(),
    getDateLocale(),
  ]);
  if (!invoice) notFound();
  const d = dict.invoiceDetail;

  const currency = auth.org.currency;
  const nextStatuses = INVOICE_TRANSITIONS[invoice.status];
  const actionLabels: Record<string, string> = {
    sent: d.markSent,
    paid: d.markPaid,
    void: d.void,
  };

  return (
    <>
      <PageHeader
        title={invoice.number}
        description={`${invoice.customerName} · ${interpolate(d.issuedOn, { date: fmtDate(invoice.issueDate, dateLocale) })} · ${interpolate(d.dueOn, { date: fmtDate(invoice.dueDate, dateLocale) })}`}
        actions={
          <>
            <Link href="/invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft /> {d.allInvoices}
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
            <CardTitle>{d.lineItems}</CardTitle>
            <StatusBadge status={invoice.status} overdue={invoice.status === "sent" && invoice.dueDate < todayIso()} />
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <THead>
                <TR>
                  <TH>{d.description}</TH>
                  <TH className="text-right">{d.qty}</TH>
                  <TH className="text-right">{d.unitPrice}</TH>
                  <TH className="text-right">{d.total}</TH>
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
            <CardTitle>{d.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>{d.subtotal}</span>
              <span>{fmtMoney(invoice.subtotalCents, currency)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>{interpolate(d.tax, { percent: (invoice.taxBps / 100).toFixed(1) })}</span>
              <span>
                {fmtMoney(invoice.totalCents - invoice.subtotalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <span>{d.total}</span>
              <span>{fmtMoney(invoice.totalCents, currency)}</span>
            </div>
            <div className="pt-3 text-xs text-zinc-500">
              <p>{interpolate(d.billedTo, { name: invoice.customerName })}</p>
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
