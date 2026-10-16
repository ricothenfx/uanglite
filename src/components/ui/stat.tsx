import type { ReactNode } from "react";
import { Card } from "./card";
import { InfoTip } from "./info-tip";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  info,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  info?: string;
  tone?: "default" | "warning" | "danger";
  icon?: ReactNode;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium text-zinc-500">
          {label}
          {info ? <InfoTip text={info} /> : null}
        </p>
        {icon ? <span className="text-zinc-400">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "warning" && "text-amber-600",
          tone === "danger" && "text-red-600",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
