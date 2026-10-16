import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Help & FAQ" };

const QA: { q: string; a: string }[] = [
  {
    q: "What is UangLite?",
    a: "UangLite is a mini-ERP for small trading businesses — products and stock, customers and suppliers, invoices with PDF output, purchase orders, and a live dashboard — with an AI pilot that can answer questions and prepare actions on top of the same business data.",
  },
  {
    q: "What is the main function of the application?",
    a: "Running the daily back office of a small business: keep a product catalog with stock levels, bill customers with invoices, restock from suppliers with purchase orders (receiving a PO automatically adds stock), and watch revenue, receivables and stock health on the dashboard. The Pilot AI layers on top so you can ask things like “which products are low?” or “draft payment reminders for overdue invoices” in plain language.",
  },
  {
    q: "What can the AI Pilot do?",
    a: "It answers grounded questions using read-only tools: stock lookups, invoice search, business KPIs (revenue, outstanding, overdue) and anomaly scans. For anything that writes, it only prepares a draft — a restock purchase order or a payment reminder email — and waits for your explicit approval before anything is created.",
  },
  {
    q: "Why do write actions require my approval?",
    a: "Human-in-the-loop by design. An agent that can silently mutate business data is unsafe, so UangLite's write tools stop mid-run and render Approve / Decline buttons in the chat. Nothing is created until you approve, and every approved draft stays editable. This pattern keeps the AI useful without giving up control.",
  },
  {
    q: "How is my data isolated from other tenants?",
    a: "Every tenant (workspace) shares one database but never sees another's rows. The app connects with a database role that cannot bypass Postgres Row-Level Security; each query sets the current tenant and RLS policies filter every read and write. This is verified by automated tests, including an attempt to write across tenants that is rejected at the database level.",
  },
  {
    q: "How does UangLite track AI costs?",
    a: "Every model call is logged per tenant with the model name, token counts, tool usage, latency and an estimated cost based on per-token pricing. Owners see the breakdown on the AI Usage page, so agent spending is transparent and attributable per workspace.",
  },
  {
    q: "What do the invoice and purchase order statuses mean?",
    a: "Invoices: Draft (editable, not counted as revenue) → Sent (customer owes you; past the due date it shows as Overdue) → Paid or Void. Purchase orders: Draft → Sent to the supplier → Received, which automatically increases product stock. The Pilot creates invoices' companion POs only as drafts for you to approve.",
  },
  {
    q: "Who is this for, and how do I try it?",
    a: "It is a portfolio project: a realistic demo of how a small business tool with a grounded, approval-gated AI agent could work. Sign in with the demo tenant demo@uanglite.dev / demo1234 (pre-filled on the login page), or register a workspace of your own from the sign-up page.",
  },
  {
    q: "What is the tech stack?",
    a: "Next.js (App Router, React Server Components, partial prerendering) with TypeScript and Tailwind CSS on the front; PostgreSQL with Drizzle ORM and row-level security for multi-tenancy; the Vercel AI SDK for the pilot with tool-call approvals; Playwright and Vitest test suites (including agent evaluations against a mocked model); GitHub Actions CI; Docker files for self-hosting; deployed on Vercel with a managed Postgres.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. The repository ships a Dockerfile and a docker-compose file (app + Postgres). Point DATABASE_URL at any Postgres instance, run the migrations, set a session password, and add an OpenAI-compatible API key for the Pilot. The full setup is documented in the README on GitHub.",
  },
];

export default function FaqPage() {
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
          <span className="text-sm text-zinc-400">Help &amp; FAQ</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Open app <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Frequently asked questions
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          What UangLite is, what it does, and how the AI pilot stays safe.
        </p>

        <div className="mt-6 space-y-2.5">
          {QA.map((item, i) => (
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
          Ready to poke around?{" "}
          <Link href="/login" className="font-medium underline">
            Sign in to the demo tenant
          </Link>{" "}
          and start with the Dashboard, then try the Pilot AI.
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        UangLite — a portfolio project. Source on GitHub: ricothenfx/uanglite
      </footer>
    </div>
  );
}
