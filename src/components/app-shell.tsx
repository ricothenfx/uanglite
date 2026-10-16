"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
] as const;

const NAV_SECONDARY = [
  { href: "/pilot", label: "Pilot AI", icon: Sparkles, highlight: true },
  { href: "/usage", label: "AI Usage", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const renderLink = (item: {
    href: string;
    label: string;
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
      {item.label}
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
      {Array.from({ length: 9 }).map((_, i) => (
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
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-white">
              <Wallet className="size-3.5" />
            </span>
            UangLite
          </span>
          <div className="ml-auto">{userChip}</div>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-zinc-900/40"
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
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </button>
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
