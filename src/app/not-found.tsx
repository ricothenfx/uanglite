"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export default function NotFound() {
  const { dict } = useI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="text-lg font-semibold">{dict.errors.notFoundTitle}</h1>
      <p className="text-sm text-zinc-500">{dict.errors.notFoundBody}</p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        {dict.errors.backToDashboard}
      </Link>
    </main>
  );
}
