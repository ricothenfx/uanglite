"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, ScanSearch } from "lucide-react";
import {
  adjustStockAction,
  createProductAction,
  updateProductAction,
} from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { FormState } from "@/lib/form";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  costCents: number;
  minStock: number;
};

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        {state.ok}
      </p>
    );
  }
  return null;
}

export function NewProductButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createProductAction,
    {},
  );
  const [closedForOk, setClosedForOk] = useState<string | undefined>();
  if (state.ok && state.ok !== closedForOk) {
    setClosedForOk(state.ok);
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus /> New product
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New product"
      >
        <Feedback state={state} />
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="np-sku">SKU</Label>
              <Input id="np-sku" name="sku" placeholder="COF-ESP-250" required />
            </div>
            <div>
              <Label htmlFor="np-category">Category</Label>
              <Input id="np-category" name="category" placeholder="beans" />
            </div>
          </div>
          <div>
            <Label htmlFor="np-name">Name</Label>
            <Input id="np-name" name="name" placeholder="Espresso Blend 250g" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="np-price">Price</Label>
              <Input id="np-price" name="price" type="number" step="0.01" min="0" placeholder="18.00" required />
            </div>
            <div>
              <Label htmlFor="np-cost">Cost</Label>
              <Input id="np-cost" name="cost" type="number" step="0.01" min="0" placeholder="10.20" />
            </div>
            <div>
              <Label htmlFor="np-min">Min stock</Label>
              <Input id="np-min" name="minStock" type="number" min="0" defaultValue={0} />
            </div>
          </div>
          <div>
            <Label htmlFor="np-opening">Opening stock</Label>
            <Input id="np-opening" name="openingQty" type="number" min="0" defaultValue={0} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Create product"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditProductButton({ product }: { product: ProductOption }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateProductAction,
    {},
  );
  const [closedForOk, setClosedForOk] = useState<string | undefined>();
  if (state.ok && state.ok !== closedForOk) {
    setClosedForOk(state.ok);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Edit ${product.sku}`}
      >
        <Pencil className="size-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${product.sku}`}>
        <Feedback state={state} />
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={product.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`ep-sku-${product.id}`}>SKU</Label>
              <Input id={`ep-sku-${product.id}`} name="sku" defaultValue={product.sku} required />
            </div>
            <div>
              <Label htmlFor={`ep-cat-${product.id}`}>Category</Label>
              <Input id={`ep-cat-${product.id}`} name="category" defaultValue={product.category} />
            </div>
          </div>
          <div>
            <Label htmlFor={`ep-name-${product.id}`}>Name</Label>
            <Input id={`ep-name-${product.id}`} name="name" defaultValue={product.name} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`ep-price-${product.id}`}>Price</Label>
              <Input
                id={`ep-price-${product.id}`}
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(product.priceCents / 100).toFixed(2)}
              />
            </div>
            <div>
              <Label htmlFor={`ep-cost-${product.id}`}>Cost</Label>
              <Input
                id={`ep-cost-${product.id}`}
                name="cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(product.costCents / 100).toFixed(2)}
              />
            </div>
            <div>
              <Label htmlFor={`ep-min-${product.id}`}>Min stock</Label>
              <Input
                id={`ep-min-${product.id}`}
                name="minStock"
                type="number"
                min="0"
                defaultValue={product.minStock}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdjustStockButton({ productId, sku }: { productId: string; sku: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    adjustStockAction,
    {},
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Adjust stock for ${sku}`}
      >
        <ScanSearch className="size-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Adjust stock — ${sku}`}>
        <Feedback state={state} />
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={productId} />
          <div>
            <Label htmlFor={`as-delta-${productId}`}>Quantity change</Label>
            <Input
              id={`as-delta-${productId}`}
              name="delta"
              type="number"
              placeholder="-5 or +20"
              required
            />
          </div>
          <div>
            <Label htmlFor={`as-note-${productId}`}>Note</Label>
            <Textarea id={`as-note-${productId}`} name="note" placeholder="Damaged goods, stock count correction…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Applying…" : "Apply adjustment"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
