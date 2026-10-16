import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="relative mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Wallet className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">UangLite</span>
          <span className="absolute -right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </span>
        </div>
        {children}
        <p className="mt-4 text-center text-xs text-zinc-500">
          {auth.newHere}{" "}
          <a href="/faq" className="font-medium text-emerald-700 hover:underline">
            {auth.whatIsThisApp}
          </a>
        </p>
      </div>
    </main>
  );
}
