import { tool } from "ai";
import { z } from "zod";
import * as q from "@/lib/queries";
import {
  createDraftPurchaseOrder,
  createPaymentReminderDraft,
} from "@/lib/agent-queries";

export type PilotDeps = {
  listProducts: typeof q.listProducts;
  listInvoices: typeof q.listInvoices;
  getBusinessSummary: typeof q.getBusinessSummary;
  detectAnomalies: typeof q.detectAnomaliesData;
  createDraftPo: typeof createDraftPurchaseOrder;
  createReminderDraft: typeof createPaymentReminderDraft;
};

export function defaultPilotDeps(): PilotDeps {
  return {
    listProducts: q.listProducts,
    listInvoices: q.listInvoices,
    getBusinessSummary: q.getBusinessSummary,
    detectAnomalies: q.detectAnomaliesData,
    createDraftPo: createDraftPurchaseOrder,
    createReminderDraft: createPaymentReminderDraft,
  };
}

export const PILOT_TOOL_NAMES = [
  "query_stock",
  "query_invoices",
  "business_summary",
  "detect_anomalies",
  "create_purchase_order_draft",
  "draft_payment_reminder",
] as const;

export const WRITE_TOOLS: readonly string[] = [
  "create_purchase_order_draft",
  "draft_payment_reminder",
];

export function buildPilotTools(
  orgId: string,
  userId: string,
  deps: PilotDeps = defaultPilotDeps(),
) {
  return {
    query_stock: tool({
      description:
        "Look up product stock levels. Use for any inventory question: current stock of a SKU, products running low, or the full catalog. Amounts of stock always come from this tool.",
      inputSchema: z.object({
        sku: z
          .string()
          .optional()
          .describe("Exact SKU to look up. Omit to list products."),
        lowStockOnly: z
          .boolean()
          .optional()
          .describe("Only return products at or below their minimum stock level."),
      }),
      execute: async ({ sku, lowStockOnly }) => {
        const rows = await deps.listProducts(orgId, { sku, lowStockOnly });
        return {
          products: rows.map((p) => ({
            sku: p.sku,
            name: p.name,
            category: p.category,
            stockQty: p.stockQty,
            minStock: p.minStock,
            priceCents: p.priceCents,
            costCents: p.costCents,
            active: p.active,
          })),
        };
      },
    }),

    query_invoices: tool({
      description:
        "Search sales invoices. Use for questions about unpaid, overdue, or recent invoices and who owes what.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "paid"])
          .optional()
          .describe("Filter by invoice status."),
        overdueOnly: z
          .boolean()
          .optional()
          .describe("Only return invoices past their due date and unpaid."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of invoices to return (default 15)."),
      }),
      execute: async ({ status, overdueOnly, limit }) => {
        let rows = await deps.listInvoices(orgId, { status });
        if (overdueOnly) rows = rows.filter((r) => r.overdue);
        return {
          count: rows.length,
          invoices: rows.slice(0, limit ?? 15).map((r) => ({
            id: r.id,
            number: r.number,
            customer: r.customerName,
            status: r.status,
            issueDate: r.issueDate,
            dueDate: r.dueDate,
            totalCents: r.totalCents,
            overdue: r.overdue,
          })),
        };
      },
    }),

    business_summary: tool({
      description:
        "Aggregated business KPIs: revenue for a period, outstanding receivables, overdue invoices and low-stock products. Use for 'how is the business doing' questions instead of summing invoices yourself.",
      inputSchema: z.object({
        period: z
          .enum(["week", "month", "quarter"])
          .optional()
          .describe("Rolling window for revenue. Default: month."),
      }),
      execute: async ({ period }) =>
        deps.getBusinessSummary(orgId, period ?? "month"),
    }),

    detect_anomalies: tool({
      description:
        "Scan this workspace for data problems: negative stock, invoices more than 30 days overdue, and invoice totals that do not match their line items.",
      inputSchema: z.object({}),
      execute: async () => {
        const anomalies = await deps.detectAnomalies(orgId);
        return { count: anomalies.length, anomalies };
      },
    }),

    create_purchase_order_draft: tool({
      description:
        "Create a DRAFT purchase order to restock products from a supplier. It does not order anything by itself: a human must review, send and receive the PO before stock arrives. Requires user approval.",
      inputSchema: z.object({
        supplierName: z
          .string()
          .describe("Supplier name. Partial, case-insensitive match."),
        items: z
          .array(
            z.object({
              sku: z.string().describe("Exact product SKU."),
              quantity: z.number().int().min(1).describe("Units to order."),
            }),
          )
          .min(1)
          .describe("Lines to purchase."),
        note: z.string().optional().describe("Optional note stored on the PO."),
      }),
      execute: async (input) =>
        deps.createDraftPo(orgId, { ...input, userId }),
    }),

    draft_payment_reminder: tool({
      description:
        "Draft a payment reminder email for an overdue invoice. Nothing is ever sent — the draft is stored for a human to copy and send. Requires user approval.",
      inputSchema: z.object({
        invoiceNumber: z
          .string()
          .describe("Invoice number, e.g. INV-2026-0007."),
      }),
      execute: async (input) =>
        deps.createReminderDraft(orgId, { ...input, userId }),
    }),
  };
}

export type PilotTools = ReturnType<typeof buildPilotTools>;
