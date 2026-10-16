"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createPoAction } from "@/actions/purchase-orders";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { fmtMoney } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { interpolate } from "@/lib/i18n/translate";
import type { FormState } from "@/lib/form";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  costCents: number;
};

type Line = { key: number; productId: string; qty: number; unitCostCents: number };

let lineKey = 0;
const newLine = (products: ProductOption[]): Line => ({
  key: ++lineKey,
  productId: products[0]?.id ?? "",
  qty: 1,
  unitCostCents: products[0]?.costCents ?? 0,
});

export function PoForm({
  products,
  suppliers,
  currency,
  todayIso,
}: {
  products: ProductOption[];
  suppliers: { id: string; name: string }[];
  currency: string;
  todayIso: string;
}) {
  const { dict } = useI18n();
  const f = dict.poForm;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPoAction,
    {},
  );
  const [lines, setLines] = useState<Line[]>(() =>
    products.length > 0 ? [newLine(products)] : [],
  );

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => sum + l.qty * Math.max(0, l.unitCostCents), 0),
    [lines],
  );

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (products.length === 0 || suppliers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-500">
        {f.needProductAndSupplier}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map(({ productId, qty, unitCostCents }) => ({
            productId,
            qty,
            unitCostCents,
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="supplierId">{f.supplier}</Label>
          <Select id="supplierId" name="supplierId" required>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="orderDate">{f.orderDate}</Label>
          <Input id="orderDate" name="orderDate" type="date" defaultValue={todayIso} required />
        </div>
        <div>
          <Label htmlFor="expectedDate">{f.expectedDate}</Label>
          <Input id="expectedDate" name="expectedDate" type="date" />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">{f.product}</th>
              <th className="px-4 py-2.5 font-medium w-24">{f.qty}</th>
              <th className="px-4 py-2.5 font-medium w-36">{f.unitCost}</th>
              <th className="px-4 py-2.5 font-medium text-right w-32">{f.lineTotal}</th>
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
                        unitCostCents: product?.costCents ?? line.unitCostCents,
                      });
                    }}
                    aria-label={f.product}
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
                    aria-label={f.qty}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={(line.unitCostCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateLine(line.key, {
                        unitCostCents: Math.max(
                          0,
                          Math.round((Number(e.target.value) || 0) * 100),
                        ),
                      })
                    }
                    aria-label={f.unitCost}
                  />
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  {fmtMoney(line.qty * line.unitCostCents, currency)}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setLines((ls) => ls.filter((l) => l.key !== line.key))
                    }
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={f.removeLine}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((ls) => [...ls, newLine(products)])}
          >
            <Plus /> {f.addLine}
          </Button>
          <span className="text-sm font-semibold">
            {interpolate(f.subtotal, { amount: fmtMoney(subtotal, currency) })}
          </span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <Label htmlFor="notes">{f.notes}</Label>
        <Textarea id="notes" name="notes" placeholder={f.notesPlaceholder} />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || lines.length === 0}>
          {pending ? f.creating : f.createDraft}
        </Button>
      </div>
    </form>
  );
}
