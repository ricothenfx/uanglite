import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { nav } = await getDictionary();
  return { title: nav.help };
}

export default async function FaqPage() {
  const { faq } = await getDictionary();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/login" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wallet className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              UangLite
            </span>
          </Link>
          <span className="text-sm text-zinc-400">{faq.headerLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {faq.openApp} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {faq.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{faq.subtitle}</p>

        <div className="mt-6 space-y-2.5">
          {faq.qa.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-zinc-200 bg-white px-4 py-1 shadow-xs open:pb-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-sm font-medium text-zinc-800 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pt-1 text-sm leading-relaxed text-zinc-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {faq.cta}{" "}
          <Link href="/login" className="font-medium underline">
            {faq.ctaLink}
          </Link>{" "}
          {faq.ctaSuffix}
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        {faq.footer}
      </footer>
    </div>
  );
}
