import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { listCustomers, listProducts } from "@/lib/queries";
import { addDaysIso, todayIso } from "@/lib/utils";
import { InvoiceForm } from "./invoice-form";

export const metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="New invoice"
        description="Stock is deducted when the invoice is marked as sent."
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewInvoiceContent />
      </Suspense>
    </div>
  );
}

async function NewInvoiceContent() {
  const auth = await requireAuth();
  const [products, customers] = await Promise.all([
    listProducts(auth.org.id, { activeOnly: true }),
    listCustomers(auth.org.id),
  ]);
  const today = todayIso();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <InvoiceForm
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          priceCents: p.priceCents,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        taxBps={auth.org.taxBps}
        currency={auth.org.currency}
        todayIso={today}
        defaultDueIso={addDaysIso(today, 14)}
      />
    </div>
  );
}
