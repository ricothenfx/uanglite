import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { listProducts, listSuppliers } from "@/lib/queries";
import { todayIso } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";
import { PoForm } from "./po-form";

export async function generateMetadata() {
  const { poForm } = await getDictionary();
  return { title: poForm.title };
}

export default async function NewPoPage() {
  const { poForm } = await getDictionary();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={poForm.title}
        description={poForm.description}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewPoContent />
      </Suspense>
    </div>
  );
}

async function NewPoContent() {
  const auth = await requireAuth();
  const [products, suppliers] = await Promise.all([
    listProducts(auth.org.id, { activeOnly: true }),
    listSuppliers(auth.org.id),
  ]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <PoForm
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          costCents: p.costCents,
        }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        currency={auth.org.currency}
        todayIso={todayIso()}
      />
    </div>
  );
}
