"use client";

import { useI18n } from "@/lib/i18n/provider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-semibold">{dict.errors.errorTitle}</h1>
      <p className="max-w-md text-sm text-zinc-500">
        {error.message || dict.errors.errorBody}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {dict.errors.tryAgain}
      </button>
    </main>
  );
}
