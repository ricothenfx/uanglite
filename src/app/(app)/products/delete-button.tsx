"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductAction } from "@/actions/products";
import { useI18n } from "@/lib/i18n/provider";
import { interpolate } from "@/lib/i18n/translate";

export function DeleteProductButton({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const { dict } = useI18n();
  const p = dict.products;
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(interpolate(p.deleteConfirm, { sku }))
        ) {
          const fd = new FormData();
          fd.set("id", productId);
          startTransition(async () => {
            await deleteProductAction(fd);
          });
        }
      }}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
      aria-label={interpolate(p.delete, { sku })}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
