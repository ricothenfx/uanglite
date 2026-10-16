"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type NavKey = keyof Dictionary["nav"];

const NAV: { href: string; key: NavKey; icon: typeof Package }[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/invoices", key: "invoices", icon: FileText },
  { href: "/purchase-orders", key: "purchaseOrders", icon: ShoppingCart },
  { href: "/products", key: "products", icon: Package },
  { href: "/customers", key: "customers", icon: Users },
  { href: "/suppliers", key: "suppliers", icon: Truck },
];

const NAV_SECONDARY: {
  href: string;
  key: NavKey;
  icon: typeof Package;
  highlight?: boolean;
}[] = [
  { href: "/pilot", key: "pilot", icon: Sparkles, highlight: true },
  { href: "/drafts", key: "drafts", icon: ClipboardList },
  { href: "/usage", key: "usage", icon: Gauge },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/faq", key: "help", icon: CircleHelp },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const renderLink = (item: {
    href: string;
    key: NavKey;
    icon: typeof Package;
    highlight?: boolean;
  }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive(item.href)
          ? "bg-emerald-50 text-emerald-800"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
        item.highlight && !isActive(item.href) && "text-emerald-700",
      )}
    >
      <item.icon className="size-4" />
      {dict.nav[item.key]}
    </Link>
  );

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(renderLink)}
      <div className="my-2 border-t border-zinc-100" />
      {NAV_SECONDARY.map(renderLink)}
    </nav>
  );
}

function NavFallback() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-zinc-100" />
      ))}
    </div>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavFallback />}>
      <NavLinks onNavigate={onNavigate} />
    </Suspense>
  );
}

export function AppShell({
  children,
  userChip,
}: {
  children: React.ReactNode;
  userChip: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dict } = useI18n();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-200 bg-white px-4 py-5 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            UangLite
          </span>
          <span className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <Nav />
        </div>
        <div className="mt-4 border-t border-zinc-100 pt-3">{userChip}</div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
            aria-label={dict.common.openMenu}
          >
            <Menu className="size-5" />
          </button>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-white">
              <Wallet className="size-3.5" />
            </span>
            UangLite
          </span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            {userChip}
          </div>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-200 bg-white px-4 py-5">
              <div className="mb-4 flex items-center justify-between px-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                    <Wallet className="size-3.5" />
                  </span>
                  UangLite
                </span>
                <div className="flex items-center gap-1">
                  <LanguageToggle />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
                    aria-label={dict.common.closeMenu}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <Nav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
