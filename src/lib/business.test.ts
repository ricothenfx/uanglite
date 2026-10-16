import { describe, expect, it } from "vitest";
import {
  canTransitionInvoice,
  canTransitionPo,
  computeTotals,
  daysLateCount,
  findAnomalies,
  isOverdue,
  lineTotalCents,
  nextNumberFor,
} from "./business";

describe("lineTotalCents", () => {
  it("multiplies qty by unit price", () => {
    expect(lineTotalCents(3, 1500)).toBe(4500);
    expect(lineTotalCents(0, 1500)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("sums lines and applies tax in basis points", () => {
    const totals = computeTotals(
      [
        { qty: 2, unitPriceCents: 1000 },
        { qty: 1, unitPriceCents: 500 },
      ],
      900,
    );
    expect(totals.subtotalCents).toBe(2500);
    expect(totals.taxCents).toBe(225);
    expect(totals.totalCents).toBe(2725);
  });

  it("rounds tax to the nearest cent", () => {
    const totals = computeTotals([{ qty: 1, unitPriceCents: 999 }], 1100);
    expect(totals.taxCents).toBe(110);
    expect(totals.totalCents).toBe(1109);
  });

  it("handles zero tax and empty lines", () => {
    const totals = computeTotals([], 0);
    expect(totals.totalCents).toBe(0);
  });
});

describe("status transitions", () => {
  it("allows the documented invoice lifecycle", () => {
    expect(canTransitionInvoice("draft", "sent")).toBe(true);
    expect(canTransitionInvoice("sent", "paid")).toBe(true);
    expect(canTransitionInvoice("sent", "void")).toBe(true);
    expect(canTransitionInvoice("draft", "paid")).toBe(false);
    expect(canTransitionInvoice("paid", "void")).toBe(false);
    expect(canTransitionInvoice("void", "draft")).toBe(false);
  });

  it("allows the documented PO lifecycle", () => {
    expect(canTransitionPo("draft", "sent")).toBe(true);
    expect(canTransitionPo("sent", "received")).toBe(true);
    expect(canTransitionPo("draft", "received")).toBe(false);
    expect(canTransitionPo("received", "void")).toBe(false);
  });
});

describe("isOverdue", () => {
  it("is true only for sent invoices past their due date", () => {
    expect(
      isOverdue({ status: "sent", dueDate: "2026-01-01" }, "2026-01-15"),
    ).toBe(true);
    expect(
      isOverdue({ status: "paid", dueDate: "2026-01-01" }, "2026-01-15"),
    ).toBe(false);
    expect(
      isOverdue({ status: "sent", dueDate: "2026-02-01" }, "2026-01-15"),
    ).toBe(false);
  });
});

describe("daysLateCount", () => {
  it("counts days past due and never goes negative", () => {
    expect(daysLateCount("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysLateCount("2026-01-01", "2026-01-01")).toBe(0);
    expect(daysLateCount("2026-01-10", "2026-01-01")).toBe(0);
  });
});

describe("findAnomalies", () => {
  const base = {
    todayIso: "2026-03-01",
    products: [
      { id: "p1", sku: "A", name: "Product A", stockQty: 10 },
      { id: "p2", sku: "B", name: "Product B", stockQty: -3 },
    ],
    invoices: [
      {
        id: "i1",
        number: "INV-1",
        status: "sent" as const,
        dueDate: "2026-01-01",
        storedTotalCents: 2725,
        computedTotalCents: 2725,
      },
      {
        id: "i2",
        number: "INV-2",
        status: "paid" as const,
        dueDate: "2026-02-01",
        storedTotalCents: 5000,
        computedTotalCents: 4900,
      },
    ],
  };

  it("flags negative stock as high severity", () => {
    const anomalies = findAnomalies(base);
    const negative = anomalies.find((a) => a.type === "negative_stock");
    expect(negative).toBeDefined();
    expect(negative?.severity).toBe("high");
    expect(negative?.description).toContain("B");
  });

  it("flags invoices overdue for more than 30 days", () => {
    const anomalies = findAnomalies(base);
    const aging = anomalies.find((a) => a.type === "overdue_aging");
    expect(aging).toBeDefined();
    expect(aging?.description).toContain("59 days overdue");
  });

  it("flags invoice totals that do not match their lines", () => {
    const anomalies = findAnomalies(base);
    const mismatch = anomalies.find((a) => a.type === "total_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch?.refId).toBe("i2");
  });

  it("returns nothing for clean data", () => {
    const anomalies = findAnomalies({
      todayIso: "2026-03-01",
      products: [{ id: "p1", sku: "A", name: "A", stockQty: 5 }],
      invoices: [
        {
          id: "i1",
          number: "INV-1",
          status: "sent",
          dueDate: "2026-02-20",
          storedTotalCents: 1090,
          computedTotalCents: 1090,
        },
      ],
    });
    expect(anomalies).toHaveLength(0);
  });
});

describe("nextNumberFor", () => {
  it("formats zero-padded sequences", () => {
    expect(nextNumberFor("INV", 2026, 0)).toBe("INV-2026-0001");
    expect(nextNumberFor("PO", 2026, 42)).toBe("PO-2026-0043");
  });
});
