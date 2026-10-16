import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

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

const statusMap: Record<string, { label: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  received: { label: "Received", variant: "success" },
  void: { label: "Void", variant: "default" },
};

export function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue) {
    return <Badge variant="danger">Overdue</Badge>;
  }
  const mapped = statusMap[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}

export { badgeVariants };
