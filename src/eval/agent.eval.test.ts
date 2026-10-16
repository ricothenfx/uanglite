import { describe, expect, it, vi } from "vitest";
import {
  generateText,
  isStepCount,
  type ModelMessage,
  type ToolApprovalResponse,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { buildPilotTools, type PilotDeps } from "../ai/tools";

const USAGE = {
  inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

function toolCall(id: string, name: string, input: unknown) {
  return {
    content: [
      {
        type: "tool-call" as const,
        toolCallId: id,
        toolName: name,
        input: JSON.stringify(input),
      },
    ],
    finishReason: { unified: "tool-calls" as const, raw: undefined },
    usage: USAGE,
    warnings: [],
  };
}

function text(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: undefined },
    usage: USAGE,
    warnings: [],
  };
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";

function makeDeps() {
  return {
    listProducts: vi.fn(async () => [
      {
        id: "p1",
        sku: "COF-DEC-250",
        name: "Decaf Colombia 250g",
        category: "beans",
        priceCents: 2100,
        costCents: 1250,
        minStock: 30,
        stockQty: 5,
        active: true,
        orgId: ORG_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    listInvoices: vi.fn(async () => [
      {
        id: "i1",
        number: "INV-2026-0007",
        status: "sent" as const,
        issueDate: "2026-01-05",
        dueDate: "2026-01-19",
        totalCents: 109_000,
        customerName: "Brekie Bar @ Katong",
        overdue: true,
      },
    ]),
    getBusinessSummary: vi.fn(async () => ({
      period: "month" as const,
      sinceIso: "2026-02-14",
      revenueCents: 1_250_000,
      invoicesIssued: 42,
      outstanding: { count: 6, cents: 340_000 },
      overdue: { count: 2, cents: 90_000 },
      lowStock: [
        {
          sku: "COF-DEC-250",
          name: "Decaf Colombia 250g",
          stockQty: 5,
          minStock: 30,
        },
      ],
    })),
    detectAnomalies: vi.fn(async () => []),
    createDraftPo: vi.fn(async () => ({
      ok: true as const,
      poNumber: "PO-2026-0099",
      poId: "po-1",
      supplier: "Gayo Green Beans Importer",
      lines: [
        {
          sku: "COF-DEC-250",
          name: "Decaf Colombia 250g",
          qty: 60,
          unitCostCents: 1250,
          lineTotalCents: 75_000,
        },
      ],
      subtotalCents: 75_000,
    })),
    createReminderDraft: vi.fn(async () => ({
      ok: true as const,
      invoiceNumber: "INV-2026-0007",
      customer: "Brekie Bar @ Katong",
      to: "billing1@nusantara-coffee.example",
      subject: "Payment reminder",
      body: "Please pay.",
    })),
  } satisfies PilotDeps;
}

function makeAgent(deps: PilotDeps, responses: unknown[]) {
  const model = new MockLanguageModelV4({
    doGenerate: responses as never,
  });
  const tools = buildPilotTools(ORG_ID, USER_ID, deps);
  const generate = (messages: ModelMessage[]) =>
    generateText({
      model,
      system: "test system prompt",
      messages,
      tools,
      stopWhen: isStepCount(8),
      toolApproval: {
        create_purchase_order_draft: "user-approval",
        draft_payment_reminder: "user-approval",
      },
    });
  return { generate };
}

describe("pilot agent orchestration", () => {
  it("grounds stock questions in the query_stock tool", async () => {
    const deps = makeDeps();
    const { generate } = makeAgent(deps, [
      toolCall("c1", "query_stock", { sku: "COF-DEC-250" }),
      text("We have 5 units left."),
    ]);

    const result = await generate([
      { role: "user", content: "Check stock for COF-DEC-250" },
    ]);

    expect(deps.listProducts).toHaveBeenCalledWith(ORG_ID, {
      sku: "COF-DEC-250",
      lowStockOnly: undefined,
    });
    expect(result.text).toContain("5 units");
  });

  it("pauses write actions for user approval before creating anything", async () => {
    const deps = makeDeps();
    const { generate } = makeAgent(deps, [
      toolCall("c1", "query_stock", { lowStockOnly: true }),
      toolCall("c2", "create_purchase_order_draft", {
        supplierName: "Gayo Green Beans Importer",
        items: [{ sku: "COF-DEC-250", quantity: 60 }],
      }),
    ]);

    const result = await generate([
      { role: "user", content: "Restock low stock please" },
    ]);

    const approvalRequests = result.content.filter(
      (part) => part.type === "tool-approval-request",
    );
    expect(approvalRequests.length).toBeGreaterThan(0);
    expect(deps.createDraftPo).not.toHaveBeenCalled();
  });

  it("executes the draft PO after approval", async () => {
    const deps = makeDeps();
    const { generate } = makeAgent(deps, [
      toolCall("c1", "create_purchase_order_draft", {
        supplierName: "Gayo",
        items: [{ sku: "COF-DEC-250", quantity: 60 }],
      }),
      text("Draft PO created."),
    ]);

    const first = await generate([
      { role: "user", content: "Order 60 units of COF-DEC-250" },
    ]);

    const request = first.content.find(
      (part) => part.type === "tool-approval-request",
    ) as { type: "tool-approval-request"; approvalId: string };

    const approval: ToolApprovalResponse = {
      type: "tool-approval-response",
      approvalId: request.approvalId,
      approved: true,
    };

    const final = await generate([
      { role: "user", content: "Order 60 units of COF-DEC-250" },
      ...first.responseMessages,
      { role: "tool", content: [approval] },
    ]);

    expect(deps.createDraftPo).toHaveBeenCalledWith(ORG_ID, {
      supplierName: "Gayo",
      items: [{ sku: "COF-DEC-250", quantity: 60 }],
      userId: USER_ID,
    });
    expect(final.text).toContain("created");
  });

  it("never executes the write when the user denies", async () => {
    const deps = makeDeps();
    const { generate } = makeAgent(deps, [
      toolCall("c1", "draft_payment_reminder", {
        invoiceNumber: "INV-2026-0007",
      }),
      text("Understood, I will not draft anything."),
    ]);

    const first = await generate([
      { role: "user", content: "Chase INV-2026-0007" },
    ]);

    const request = first.content.find(
      (part) => part.type === "tool-approval-request",
    ) as { type: "tool-approval-request"; approvalId: string };

    const denial: ToolApprovalResponse = {
      type: "tool-approval-response",
      approvalId: request.approvalId,
      approved: false,
    };

    await generate([
      { role: "user", content: "Chase INV-2026-0007" },
      ...first.responseMessages,
      { role: "tool", content: [denial] },
    ]);

    expect(deps.createReminderDraft).not.toHaveBeenCalled();
  });

  it("answers business questions from the summary tool, not from memory", async () => {
    const deps = makeDeps();
    const { generate } = makeAgent(deps, [
      toolCall("c1", "business_summary", { period: "month" }),
      text("Revenue was 12,500.00 this month."),
    ]);

    const result = await generate([
      { role: "user", content: "How is the business doing this month?" },
    ]);

    expect(deps.getBusinessSummary).toHaveBeenCalledWith(ORG_ID, "month");
    expect(result.text).toContain("12,500.00");
  });
});
