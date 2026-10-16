import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";
import { AdjustStockButton, EditProductButton, NewProductButton } from "./product-dialogs";
import { DeleteProductButton } from "./delete-button";

export const metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Products"
        description="Catalog, pricing and stock levels."
        actions={<NewProductButton />}
      />
      <Suspense fallback={<PageSkeleton />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}

async function ProductsTable() {
  const auth = await requireAuth();
  const rows = await listProducts(auth.org.id);
  const currency = auth.org.currency;

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH>Name</TH>
              <TH>Category</TH>
              <TH className="text-right">Price</TH>
              <TH className="text-right">Cost</TH>
              <TH className="text-right">Stock</TH>
              <TH className="text-right">Min</TH>
              <TH>Status</TH>
              <TH className="w-28" />
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => {
              const low = p.stockQty <= p.minStock;
              return (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.sku}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-zinc-500">{p.category}</TD>
                  <TD className="text-right">{fmtMoney(p.priceCents, currency)}</TD>
                  <TD className="text-right text-zinc-500">
                    {fmtMoney(p.costCents, currency)}
                  </TD>
                  <TD
                    className={`text-right font-semibold ${p.stockQty < 0 ? "text-red-600" : low ? "text-amber-600" : ""}`}
                  >
                    {p.stockQty}
                  </TD>
                  <TD className="text-right text-zinc-400">{p.minStock}</TD>
                  <TD>
                    {p.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge>Archived</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <AdjustStockButton productId={p.id} sku={p.sku} />
                      <EditProductButton product={p} />
                      <DeleteProductButton productId={p.id} sku={p.sku} />
                    </div>
                  </TD>
                </TR>
              );
            })}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-zinc-500">
                  No products yet. Create your first one to start invoicing.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
