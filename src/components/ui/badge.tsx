"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-700",
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        info: "bg-sky-50 text-sky-700",
        outline: "border border-zinc-300 text-zinc-600",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const { dict } = useI18n();
  const labels = dict.status as Record<string, string>;
  if (overdue) {
    return <Badge variant="danger">{dict.status.overdue}</Badge>;
  }
  const variants: Record<
    string,
    NonNullable<VariantProps<typeof badgeVariants>["variant"]>
  > = {
    draft: "outline",
    sent: "info",
    paid: "success",
    received: "success",
    void: "default",
  };
  const label = labels[status] ?? status;
  const variant = variants[status] ?? "default";
  return <Badge variant={variant}>{label}</Badge>;
}

export { badgeVariants };
