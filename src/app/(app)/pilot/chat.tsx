"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import {
  AlertTriangle,
  ArrowUp,
  BadgeCheck,
  Ban,
  BarChart3,
  FileWarning,
  Loader2,
  Package,
  ReceiptText,
  ShoppingCart,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, fmtMoney } from "@/lib/utils";

type ToolPartView = {
  type: string;
  toolCallId: string;
  state: string;
  toolName?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    isAutomatic?: boolean;
    approved?: boolean;
    requestReason?: string;
  };
};

const SUGGESTIONS = [
  "How is the business doing this month?",
  "Which products are running low on stock?",
  "Restock all low-stock products from their supplier",
  "Which invoices are overdue? Draft payment reminders for the worst one.",
];

export function PilotChat({ currency }: { currency: string }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    stop,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-zinc-200 bg-white">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-md space-y-4 pt-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <BadgeCheck className="size-6" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Your business pilot</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Ask about stock, invoices and KPIs. For write actions the pilot
                prepares drafts that you approve before anything happens.
              </p>
            </div>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm text-white">
                <p className="whitespace-pre-wrap">
                  {message.parts
                    .map((p) => (p.type === "text" ? p.text : ""))
                    .join("")}
                </p>
              </div>
            </div>
          ) : (
            <div key={message.id} className="space-y-2">
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return part.text ? (
                    <div
                      key={`${message.id}-${i}`}
                      className="max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800"
                    >
                      {part.text}
                    </div>
                  ) : null;
                }
                if (
                  part.type === "step-start" ||
                  part.type === "file" ||
                  part.type.startsWith("data-")
                ) {
                  return null;
                }
                const toolPart = part as unknown as ToolPartView;
                return (
                  <ToolCard
                    key={toolPart.toolCallId ?? `${message.id}-${i}`}
                    part={toolPart}
                    currency={currency}
                    onApprove={(approved) =>
                      toolPart.approval &&
                      addToolApprovalResponse({
                        id: toolPart.approval.id,
                        approved,
                      })
                    }
                  />
                );
              })}
            </div>
          ),
        )}

        {status === "submitted" ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </div>
        ) : null}

        {error ? (
          <div className="max-w-[85%] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <p className="font-medium">The pilot hit an error.</p>
            <p className="mt-0.5">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => regenerate()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-zinc-100 p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-emerald-500">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask about stock, invoices, KPIs…"
            className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={() => stop()}>
              <Ban className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-zinc-400">
          The pilot can only draft POs and reminder emails — you approve every
          write action. AI usage and cost are tracked per tenant.
        </p>
      </form>
    </div>
  );
}

function ToolCard({
  part,
  currency,
  onApprove,
}: {
  part: ToolPartView;
  currency: string;
  onApprove: (approved: boolean) => void;
}) {
  const toolName = part.toolName ?? part.type.replace(/^tool-/, "");
  const meta = TOOL_META[toolName] ?? {
    icon: Table2,
    label: toolName,
  };
  const Icon = meta.icon;

  return (
    <div className="max-w-[85%] overflow-hidden rounded-xl border border-zinc-200">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
        <Icon className="size-3.5 text-emerald-700" />
        <span className="text-xs font-medium text-zinc-700">{meta.label}</span>
        {part.state === "input-streaming" || part.state === "input-available" ? (
          <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-400" />
        ) : null}
        {part.state === "output-available" ? (
          <BadgeCheck className="ml-auto size-3.5 text-emerald-600" />
        ) : null}
        {part.state === "output-denied" ? (
          <Badge variant="danger" className="ml-auto">
            denied
          </Badge>
        ) : null}
      </div>

      <div className="px-3 py-2.5">
        {part.state === "input-streaming" ? (
          <p className="text-xs text-zinc-400">Preparing request…</p>
        ) : null}

        {part.state === "input-available" ? (
          <InputSummary name={toolName} input={part.input} />
        ) : null}

        {part.state === "approval-requested" ? (
          <div>
            <InputSummary name={toolName} input={part.input} />
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">
                {part.approval?.requestReason ??
                  "This write action needs your approval."}
              </p>
              {!part.approval?.isAutomatic ? (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => onApprove(true)}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(false)}
                  >
                    Deny
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {part.state === "approval-responded" ? (
          <p className="text-xs text-zinc-500">
            {part.approval?.approved ? "Approved — running…" : "Denied."}
          </p>
        ) : null}

        {part.state === "output-error" ? (
          <p className="text-xs text-red-600">
            {part.errorText ?? "The tool failed."}
          </p>
        ) : null}

        {part.state === "output-denied" ? (
          <p className="text-xs text-zinc-500">
            You denied this action. Nothing was created.
          </p>
        ) : null}

        {part.state === "output-available" ? (
          <OutputView name={toolName} output={part.output} currency={currency} />
        ) : null}
      </div>
    </div>
  );
}

const TOOL_META: Record<string, { icon: typeof Package; label: string }> = {
  query_stock: { icon: Package, label: "Stock lookup" },
  query_invoices: { icon: ReceiptText, label: "Invoice lookup" },
  business_summary: { icon: BarChart3, label: "Business summary" },
  detect_anomalies: { icon: FileWarning, label: "Anomaly scan" },
  create_purchase_order_draft: { icon: ShoppingCart, label: "Draft purchase order" },
  draft_payment_reminder: { icon: AlertTriangle, label: "Payment reminder draft" },
};

function InputSummary({
  name,
  input,
}: {
  name: string;
  input?: Record<string, unknown>;
}) {
  if (!input) return null;
  if (name === "create_purchase_order_draft" && Array.isArray(input.items)) {
    return (
      <div className="text-xs text-zinc-600">
        <p>
          Supplier: <span className="font-medium">{String(input.supplierName ?? "—")}</span>
        </p>
        <ul className="mt-1 space-y-0.5">
          {(input.items as { sku?: string; quantity?: number }[]).map((item, i) => (
            <li key={i}>
              {item.quantity}× {item.sku}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (name === "draft_payment_reminder" && input.invoiceNumber) {
    return (
      <p className="text-xs text-zinc-600">
        Invoice <span className="font-mono font-medium">{String(input.invoiceNumber)}</span>
      </p>
    );
  }
  const parts = Object.entries(input).filter(([, v]) => v !== undefined);
  if (parts.length === 0) return null;
  return (
    <p className="text-xs text-zinc-600">
      {parts.map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
    </p>
  );
}

type StockOutput = {
  products?: {
    sku: string;
    name: string;
    stockQty: number;
    minStock: number;
    priceCents: number;
  }[];
};

type InvoiceOutput = {
  count?: number;
  invoices?: {
    id: string;
    number: string;
    customer: string;
    status: string;
    dueDate: string;
    totalCents: number;
    overdue: boolean;
  }[];
};

type SummaryOutput = {
  period?: string;
  revenueCents?: number;
  invoicesIssued?: number;
  outstanding?: { count: number; cents: number };
  overdue?: { count: number; cents: number };
  lowStock?: { sku: string; name: string; stockQty: number; minStock: number }[];
};

type AnomalyOutput = {
  count?: number;
  anomalies?: {
    type: string;
    severity: string;
    description: string;
  }[];
};

type PoOutput = {
  ok?: boolean;
  error?: string;
  matches?: string[];
  poNumber?: string;
  poId?: string;
  supplier?: string;
  lines?: { sku: string; qty: number; unitCostCents: number; lineTotalCents: number }[];
  subtotalCents?: number;
};

type ReminderOutput = {
  ok?: boolean;
  error?: string;
  invoiceStatus?: string;
  dueDate?: string;
  invoiceNumber?: string;
  customer?: string;
  to?: string | null;
  subject?: string;
  body?: string;
};

function OutputView({
  name,
  output,
  currency,
}: {
  name: string;
  output: unknown;
  currency: string;
}) {
  if (output == null) return null;

  if (name === "query_stock") {
    const data = output as StockOutput;
    const products = data.products ?? [];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-400">
              <th className="py-1 pr-3 font-medium">SKU</th>
              <th className="py-1 pr-3 font-medium">Product</th>
              <th className="py-1 pr-3 text-right font-medium">Stock</th>
              <th className="py-1 text-right font-medium">Min</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="border-t border-zinc-100">
                <td className="py-1 pr-3 font-mono">{p.sku}</td>
                <td className="py-1 pr-3">{p.name}</td>
                <td
                  className={cn(
                    "py-1 pr-3 text-right font-semibold",
                    p.stockQty <= p.minStock
                      ? p.stockQty < 0
                        ? "text-red-600"
                        : "text-amber-600"
                      : "",
                  )}
                >
                  {p.stockQty}
                </td>
                <td className="py-1 text-right text-zinc-400">{p.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (name === "query_invoices") {
    const data = output as InvoiceOutput;
    return (
      <div className="space-y-1">
        <p className="text-xs text-zinc-500">{data.count ?? 0} matching invoices</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {(data.invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-t border-zinc-100">
                  <td className="py-1 pr-3 font-mono">{inv.number}</td>
                  <td className="py-1 pr-3">{inv.customer}</td>
                  <td className="py-1 pr-3">
                    {inv.overdue ? (
                      <Badge variant="danger">overdue</Badge>
                    ) : (
                      <Badge>{inv.status}</Badge>
                    )}
                  </td>
                  <td className="py-1 pr-3 text-zinc-400">{inv.dueDate}</td>
                  <td className="py-1 text-right font-medium">
                    {fmtMoney(inv.totalCents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (name === "business_summary") {
    const data = output as SummaryOutput;
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        <SummaryItem label="Revenue" value={fmtMoney(data.revenueCents ?? 0, currency)} />
        <SummaryItem
          label="Invoices issued"
          value={String(data.invoicesIssued ?? 0)}
        />
        <SummaryItem
          label="Outstanding"
          value={`${data.outstanding?.count ?? 0} · ${fmtMoney(data.outstanding?.cents ?? 0, currency)}`}
        />
        <SummaryItem
          label="Overdue"
          value={`${data.overdue?.count ?? 0} · ${fmtMoney(data.overdue?.cents ?? 0, currency)}`}
        />
        <div className="col-span-2">
          <p className="mb-1 font-medium text-zinc-600">
            Low stock ({data.lowStock?.length ?? 0})
          </p>
          <ul className="space-y-0.5 text-zinc-500">
            {(data.lowStock ?? []).slice(0, 5).map((p) => (
              <li key={p.sku}>
                {p.sku} — {p.name}: {p.stockQty}/{p.minStock}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (name === "detect_anomalies") {
    const data = output as AnomalyOutput;
    if ((data.count ?? 0) === 0) {
      return <p className="text-xs text-emerald-700">No anomalies found.</p>;
    }
    return (
      <ul className="space-y-1.5">
        {(data.anomalies ?? []).map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <Badge variant={a.severity === "high" ? "danger" : "warning"}>
              {a.severity}
            </Badge>
            <span className="text-zinc-600">{a.description}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (name === "create_purchase_order_draft") {
    const data = output as PoOutput;
    if (data.ok === false) {
      return (
        <div className="text-xs text-red-600">
          <p>{data.error}</p>
          {data.matches ? (
            <p className="mt-1 text-zinc-500">Did you mean: {data.matches.join(", ")}?</p>
          ) : null}
        </div>
      );
    }
    return (
      <div className="text-xs">
        <p className="font-medium text-emerald-700">
          Draft {data.poNumber} created for {data.supplier}.
        </p>
        <ul className="mt-1 space-y-0.5 text-zinc-600">
          {(data.lines ?? []).map((l) => (
            <li key={l.sku}>
              {l.qty}× {l.sku} @ {fmtMoney(l.unitCostCents, currency)}
            </li>
          ))}
        </ul>
        <p className="mt-1 font-semibold">
          Subtotal: {fmtMoney(data.subtotalCents ?? 0, currency)}
        </p>
        {data.poId ? (
          <a
            href={`/purchase-orders/${data.poId}`}
            className="mt-1.5 inline-block font-medium text-emerald-700 hover:underline"
          >
            Open {data.poNumber} →
          </a>
        ) : null}
      </div>
    );
  }

  if (name === "draft_payment_reminder") {
    const data = output as ReminderOutput;
    if (data.ok === false) {
      return (
        <div className="text-xs text-red-600">
          <p>{data.error}</p>
          {data.invoiceStatus ? (
            <p className="mt-1 text-zinc-500">
              Status: {data.invoiceStatus}, due {data.dueDate}
            </p>
          ) : null}
        </div>
      );
    }
    return (
      <div className="text-xs">
        <p className="font-medium text-emerald-700">
          Reminder draft for {data.invoiceNumber} ({data.customer}) stored.
        </p>
        <div className="mt-1.5 rounded-lg bg-zinc-50 p-2.5">
          <p className="font-medium text-zinc-700">{data.subject}</p>
          <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-zinc-500">
            {data.body}
          </p>
        </div>
        <p className="mt-1 text-zinc-400">
          To: {data.to ?? "no email on file"} — nothing was sent.
        </p>
        <a
          href="/drafts"
          className="mt-1 inline-block font-medium text-emerald-700 hover:underline"
        >
          View all drafts →
        </a>
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded bg-zinc-50 p-2 text-[10px] text-zinc-500">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="font-semibold text-zinc-700">{value}</p>
    </div>
  );
}
