"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createInvoiceAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { fmtMoney } from "@/lib/utils";
import type { FormState } from "@/lib/form";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
};

type Line = { key: number; productId: string; qty: number; unitPriceCents: number };

let lineKey = 0;
const newLine = (products: ProductOption[]): Line => ({
  key: ++lineKey,
  productId: products[0]?.id ?? "",
  qty: 1,
  unitPriceCents: products[0]?.priceCents ?? 0,
});

export function InvoiceForm({
  products,
  customers,
  taxBps,
  currency,
  todayIso,
  defaultDueIso,
}: {
  products: ProductOption[];
  customers: { id: string; name: string }[];
  taxBps: number;
  currency: string;
  todayIso: string;
  defaultDueIso: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createInvoiceAction,
    {},
  );
  const [lines, setLines] = useState<Line[]>(() =>
    products.length > 0 ? [newLine(products)] : [],
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, l) => sum + l.qty * Math.max(0, l.unitPriceCents),
      0,
    );
    const tax = Math.round((subtotal * taxBps) / 10_000);
    return { subtotal, tax, total: subtotal + tax };
  }, [lines, taxBps]);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (products.length === 0 || customers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-500">
        You need at least one product and one customer before creating an
        invoice.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map(({ productId, qty, unitPriceCents }) => ({
            productId,
            qty,
            unitPriceCents,
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="customerId">Customer</Label>
          <Select id="customerId" name="customerId" required>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={todayIso} required />
        </div>
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueIso} required />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium w-24">Qty</th>
              <th className="px-4 py-2.5 font-medium w-36">Unit price</th>
              <th className="px-4 py-2.5 font-medium text-right w-32">Line total</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.map((line) => (
              <tr key={line.key}>
                <td className="px-4 py-2">
                  <Select
                    value={line.productId}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      updateLine(line.key, {
                        productId: e.target.value,
                        unitPriceCents: product?.priceCents ?? line.unitPriceCents,
                      });
                    }}
                    aria-label="Product"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(e) =>
                      updateLine(line.key, { qty: Math.max(1, Number(e.target.value) || 1) })
                    }
                    aria-label="Quantity"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={(line.unitPriceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateLine(line.key, {
                        unitPriceCents: Math.max(
                          0,
                          Math.round((Number(e.target.value) || 0) * 100),
                        ),
                      })
                    }
                    aria-label="Unit price"
                  />
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  {fmtMoney(line.qty * line.unitPriceCents, currency)}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setLines((ls) => ls.filter((l) => l.key !== line.key))
                    }
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-zinc-100 px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((ls) => [...ls, newLine(products)])}
          >
            <Plus /> Add line
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Payment terms, PO reference…" />
        </div>
        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span>
            <span>{fmtMoney(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Tax ({(taxBps / 100).toFixed(1)}%)</span>
            <span>{fmtMoney(totals.tax, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-base font-semibold">
            <span>Total</span>
            <span>{fmtMoney(totals.total, currency)}</span>
          </div>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || lines.length === 0}>
          {pending ? "Creating…" : "Create draft invoice"}
        </Button>
      </div>
    </form>
  );
}
