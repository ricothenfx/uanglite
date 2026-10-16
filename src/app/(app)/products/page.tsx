import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";
import { AdjustStockButton, EditProductButton, NewProductButton } from "./product-dialogs";
import { DeleteProductButton } from "./delete-button";

export async function generateMetadata() {
  const { nav } = await getDictionary();
  return { title: nav.products };
}

export default async function ProductsPage() {
  const { products } = await getDictionary();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={products.title}
        description={products.description}
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
  const [rows, dict] = await Promise.all([
    listProducts(auth.org.id),
    getDictionary(),
  ]);
  const p = dict.products;
  const currency = auth.org.currency;

  return (
    <Card>
      <CardContent className="px-0 pb-2">
        <Table>
          <THead>
            <TR>
              <TH>{p.sku}</TH>
              <TH>{p.name}</TH>
              <TH>{p.category}</TH>
              <TH className="text-right">
                <span className="flex items-center justify-end gap-1">
                  {p.price}
                  <InfoTip side="bottom" text={p.priceInfo} />
                </span>
              </TH>
              <TH className="text-right">
                <span className="flex items-center justify-end gap-1">
                  {p.cost}
                  <InfoTip side="bottom" text={p.costInfo} />
                </span>
              </TH>
              <TH className="text-right">
                <span className="flex items-center justify-end gap-1">
                  {p.stock}
                  <InfoTip side="bottom" text={p.stockInfo} />
                </span>
              </TH>
              <TH className="text-right">
                <span className="flex items-center gap-1 justify-end">
                  {p.min}
                  <InfoTip side="bottom" text={p.minInfo} />
                </span>
              </TH>
              <TH>{p.status}</TH>
              <TH className="w-28" />
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => {
              const low = row.stockQty <= row.minStock;
              return (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.sku}</TD>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="text-zinc-500">{row.category}</TD>
                  <TD className="text-right">{fmtMoney(row.priceCents, currency)}</TD>
                  <TD className="text-right text-zinc-500">
                    {fmtMoney(row.costCents, currency)}
                  </TD>
                  <TD
                    className={`text-right font-semibold ${row.stockQty < 0 ? "text-red-600" : low ? "text-amber-600" : ""}`}
                  >
                    {row.stockQty}
                  </TD>
                  <TD className="text-right text-zinc-400">{row.minStock}</TD>
                  <TD>
                    {row.active ? (
                      <Badge variant="success">{p.active}</Badge>
                    ) : (
                      <Badge>{p.archived}</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <AdjustStockButton productId={row.id} sku={row.sku} />
                      <EditProductButton product={row} />
                      <DeleteProductButton productId={row.id} sku={row.sku} />
                    </div>
                  </TD>
                </TR>
              );
            })}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-zinc-500">
                  {p.noneYet}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
