export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type PoStatus = "draft" | "sent" | "received" | "void";

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

export const PO_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ["sent", "void"],
  sent: ["received", "void"],
  received: [],
  void: [],
};

export function canTransitionInvoice(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

export function canTransitionPo(from: PoStatus, to: PoStatus): boolean {
  return PO_TRANSITIONS[from].includes(to);
}

export type LineInput = { qty: number; unitPriceCents: number };

export function lineTotalCents(qty: number, unitPriceCents: number): number {
  return qty * unitPriceCents;
}

export function computeTotals(
  lines: LineInput[],
  taxBps: number,
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lines.reduce(
    (sum, l) => sum + lineTotalCents(l.qty, l.unitPriceCents),
    0,
  );
  const taxCents = Math.round((subtotalCents * taxBps) / 10_000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function isOverdue(
  invoice: { status: InvoiceStatus; dueDate: string },
  todayIso: string,
): boolean {
  return invoice.status === "sent" && invoice.dueDate < todayIso;
}

export type Anomaly = {
  type: "negative_stock" | "overdue_aging" | "total_mismatch";
  severity: "high" | "medium" | "low";
  description: string;
  refId?: string;
};

export type AnomalyInput = {
  todayIso: string;
  products: { id: string; sku: string; name: string; stockQty: number }[];
  invoices: {
    id: string;
    number: string;
    status: InvoiceStatus;
    dueDate: string;
    storedTotalCents: number;
    computedTotalCents: number;
  }[];
};

export function findAnomalies(input: AnomalyInput): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const p of input.products) {
    if (p.stockQty < 0) {
      anomalies.push({
        type: "negative_stock",
        severity: "high",
        description: `${p.sku} — ${p.name} has negative stock (${p.stockQty} units). Overselling likely.`,
        refId: p.id,
      });
    }
  }

  for (const inv of input.invoices) {
    if (inv.status === "sent" && input.todayIso > inv.dueDate) {
      const daysLate = daysLateCount(inv.dueDate, input.todayIso);
      if (daysLate > 30) {
        anomalies.push({
          type: "overdue_aging",
          severity: "high",
          description: `${inv.number} is ${daysLate} days overdue and still unpaid.`,
          refId: inv.id,
        });
      }
    }
    if (inv.status !== "void" && inv.storedTotalCents !== inv.computedTotalCents) {
      anomalies.push({
        type: "total_mismatch",
        severity: "medium",
        description: `${inv.number} stored total does not match the sum of its line items.`,
        refId: inv.id,
      });
    }
  }

  return anomalies;
}

export function daysLateCount(dueIso: string, todayIso: string): number {
  const due = new Date(dueIso + "T00:00:00Z").getTime();
  const today = new Date(todayIso + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((today - due) / 86_400_000));
}

export function nextNumberFor(
  prefix: string,
  year: number,
  maxExisting: number,
): string {
  return `${prefix}-${year}-${String(maxExisting + 1).padStart(4, "0")}`;
}
