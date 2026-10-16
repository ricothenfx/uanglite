import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoTip({
  text,
  side = "top",
  className,
}: {
  text: string;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={`Info: ${text}`}
        className="flex rounded-full text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-60 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-normal leading-relaxed text-zinc-50 opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {text}
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 border-5 border-transparent opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top"
            ? "bottom-full mb-1 border-t-zinc-900"
            : "top-full mt-1 border-b-zinc-900",
        )}
      />
    </span>
  );
}
