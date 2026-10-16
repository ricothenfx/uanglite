"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductAction } from "@/actions/products";

export function DeleteProductButton({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(
            `Delete ${sku}? Products used by invoices cannot be deleted.`,
          )
        ) {
          const fd = new FormData();
          fd.set("id", productId);
          startTransition(async () => {
            await deleteProductAction(fd);
          });
        }
      }}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${sku}`}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
