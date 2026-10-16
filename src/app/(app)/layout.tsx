import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { UserChip } from "./user-chip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      userChip={
        <Suspense
          fallback={<div className="h-8 w-32 animate-pulse rounded-lg bg-zinc-100" />}
        >
          <UserChip />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
