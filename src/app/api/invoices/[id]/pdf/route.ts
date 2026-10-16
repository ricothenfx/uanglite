import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/components/invoice-pdf";
import { getAuthContext } from "@/lib/auth";
import { getInvoiceDetail } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/invoices/[id]/pdf">,
) {
  const auth = await getAuthContext();
  if (!auth) {
    return new Response(null, { status: 401 });
  }

  const { id } = await ctx.params;
  const invoice = await getInvoiceDetail(auth.org.id, id);
  if (!invoice) {
    return new Response(null, { status: 404 });
  }

  const buffer = await renderToBuffer(
    createElement(InvoicePdfDocument, {
      data: {
        orgName: auth.org.name,
        currency: auth.org.currency,
        number: invoice.number,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        items: invoice.items.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
        })),
        subtotalCents: invoice.subtotalCents,
        taxBps: invoice.taxBps,
        totalCents: invoice.totalCents,
        notes: invoice.notes,
      },
    }) as unknown as React.ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
