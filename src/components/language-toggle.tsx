"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLocaleAction } from "@/actions/locale";
import { LOCALES, LOCALES_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const select = (next: Locale) => {
    setOpen(false);
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.common.chooseLanguage}
        aria-haspopup="menu"
        aria-expanded={open}
        title={dict.common.chooseLanguage}
        className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
      >
        <Languages className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-md"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              onClick={() => select(l)}
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100",
                l === locale && "font-medium text-emerald-700",
              )}
            >
              {LOCALES_META[l].native}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
