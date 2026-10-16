import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Wallet className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">UangLite</span>
        </div>
        {children}
      </div>
    </main>
  );
}
