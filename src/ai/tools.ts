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
  listSuppliersWithStats: typeof q.listSuppliersWithStats;
  listCustomersWithStats: typeof q.listCustomersWithStats;
  listPurchaseOrders: typeof q.listPurchaseOrders;
  getProductSales: typeof q.getProductSales;
  getStockMovementsBySku: typeof q.getStockMovementsBySku;
  getInvoiceDetailByNumber: typeof q.getInvoiceDetailByNumber;
  createDraftPo: typeof createDraftPurchaseOrder;
  createReminderDraft: typeof createPaymentReminderDraft;
};

export function defaultPilotDeps(): PilotDeps {
  return {
    listProducts: q.listProducts,
    listInvoices: q.listInvoices,
    getBusinessSummary: q.getBusinessSummary,
    detectAnomalies: q.detectAnomaliesData,
    listSuppliersWithStats: q.listSuppliersWithStats,
    listCustomersWithStats: q.listCustomersWithStats,
    listPurchaseOrders: q.listPurchaseOrders,
    getProductSales: q.getProductSales,
    getStockMovementsBySku: q.getStockMovementsBySku,
    getInvoiceDetailByNumber: q.getInvoiceDetailByNumber,
    createDraftPo: createDraftPurchaseOrder,
    createReminderDraft: createPaymentReminderDraft,
  };
}

export const PILOT_TOOL_NAMES = [
  "query_stock",
  "query_invoices",
  "business_summary",
  "detect_anomalies",
  "query_suppliers",
  "query_customers",
  "query_purchase_orders",
  "query_product_sales",
  "query_stock_movements",
  "query_invoice_detail",
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

    query_suppliers: tool({
      description:
        "List suppliers with contact details and purchasing stats: total POs, still-open POs, total ordered value, last order date, and which products each supplier provides (derived from purchase orders). Optionally filter by product SKU to find who supplies it. Use for any supplier question.",
      inputSchema: z.object({
        sku: z
          .string()
          .optional()
          .describe(
            "Only include suppliers that have supplied this product SKU on purchase orders, e.g. COF-ESP-250.",
          ),
      }),
      execute: async ({ sku }) => {
        const rows = await deps.listSuppliersWithStats(orgId, { sku });
        return { count: rows.length, suppliers: rows };
      },
    }),

    query_customers: tool({
      description:
        "List customers with sales stats derived from invoices: invoice count, total invoiced, outstanding (sent, unpaid) and overdue counts plus amounts. Use for 'top customers', 'who owes us the most', or to find a customer's contact details.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await deps.listCustomersWithStats(orgId);
        return { count: rows.length, customers: rows };
      },
    }),

    query_purchase_orders: tool({
      description:
        "List purchase orders with supplier, status, order/expected dates and subtotal. Flags sent POs whose expected date has passed without being received. Use for 'what did we order', 'what is arriving late', 'POs from supplier X'.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "received", "void"])
          .optional()
          .describe("Filter by exact PO status."),
        openOnly: z
          .boolean()
          .optional()
          .describe("Only POs not yet received or voided (draft + sent)."),
      }),
      execute: async ({ status, openOnly }) => {
        const rows = await deps.listPurchaseOrders(orgId, { status, openOnly });
        return { count: rows.length, purchaseOrders: rows };
      },
    }),

    query_product_sales: tool({
      description:
        "Best-selling products over a period from sent/paid invoices: units sold, number of orders and revenue per SKU, ranked by revenue. Use for 'best sellers', 'what sells well', or to sanity-check restock quantities against real demand.",
      inputSchema: z.object({
        period: z
          .enum(["week", "month", "quarter", "year", "all"])
          .optional()
          .describe("Rolling window for sales. Default: month."),
      }),
      execute: async ({ period }) => {
        const p = period ?? "month";
        const rows = await deps.getProductSales(orgId, p);
        return { period: p, count: rows.length, products: rows };
      },
    }),

    query_stock_movements: tool({
      description:
        "Recent stock movement history for one product SKU: dated entries with signed quantity, reason (sale, PO receipt, manual adjustment) and note. Use for 'why did stock change', 'when was this last restocked'.",
      inputSchema: z.object({
        sku: z.string().describe("Exact product SKU, e.g. COF-ESP-250."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum movements to return (default 20)."),
      }),
      execute: async ({ sku, limit }) => {
        const rows = await deps.getStockMovementsBySku(
          orgId,
          sku,
          limit ?? 20,
        );
        return { sku, count: rows.length, movements: rows };
      },
    }),

    query_invoice_detail: tool({
      description:
        "Full detail of one sales invoice by number: customer, status, dates, subtotal, tax, grand total and every line item (SKU, qty, unit price, line total). Use when a row from query_invoices is not enough, e.g. 'what is on INV-2026-0007?'.",
      inputSchema: z.object({
        invoiceNumber: z
          .string()
          .describe("Invoice number, e.g. INV-2026-0007."),
      }),
      execute: async ({ invoiceNumber }) => {
        const detail = await deps.getInvoiceDetailByNumber(
          orgId,
          invoiceNumber,
        );
        return detail ?? { error: `Invoice ${invoiceNumber} not found.` };
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
