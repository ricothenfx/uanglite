import type { DocumentProps } from "@react-pdf/renderer";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { fmtDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brand: { fontSize: 18, fontWeight: 700, color: "#059669" },
  meta: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#71717a" },
  party: { marginBottom: 18 },
  partyTitle: { fontSize: 8, textTransform: "uppercase", color: "#71717a", marginBottom: 2 },
  table: {
    flexDirection: "row",
    borderTop: 1,
    borderBottom: 1,
    borderColor: "#e4e4e7",
    paddingVertical: 6,
    fontSize: 9,
    color: "#71717a",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: 1,
    borderColor: "#f4f4f5",
  },
  colDesc: { width: "50%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "17.5%", textAlign: "right" },
  colTotal: { width: "17.5%", textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    color: "#71717a",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: 1,
    borderColor: "#e4e4e7",
    marginTop: 4,
    paddingTop: 6,
    fontWeight: 700,
    fontSize: 12,
  },
  notes: { marginTop: 24, color: "#71717a" },
});

export type InvoicePdfData = {
  orgName: string;
  currency: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string | null;
  items: { description: string; qty: number; unitPriceCents: number; lineTotalCents: number }[];
  subtotalCents: number;
  taxBps: number;
  totalCents: number;
  notes: string | null;
};

function money(cents: number, currency: string) {
  const value = cents / 100;
  const digits = currency === "IDR" ? 0 : 2;
  return `${currency} ${value.toLocaleString("en-SG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function InvoicePdfDocument({
  data,
}: {
  data: InvoicePdfData;
}): React.ReactElement<DocumentProps> {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.orgName}</Text>
            <Text style={styles.muted}>Powered by UangLite</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.invoiceLabel}>INVOICE {data.number}</Text>
            <Text style={styles.muted}>Issued {fmtDate(data.issueDate)}</Text>
            <Text style={styles.muted}>Due {fmtDate(data.dueDate)}</Text>
            <Text style={styles.muted}>Status: {data.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.party}>
          <Text style={styles.partyTitle}>Billed to</Text>
          <Text style={{ fontWeight: 700 }}>{data.customerName}</Text>
          {data.customerEmail ? <Text style={styles.muted}>{data.customerEmail}</Text> : null}
        </View>

        <View style={styles.table}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{item.qty}</Text>
            <Text style={styles.colPrice}>{money(item.unitPriceCents, data.currency)}</Text>
            <Text style={styles.colTotal}>{money(item.lineTotalCents, data.currency)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{money(data.subtotalCents, data.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax ({(data.taxBps / 100).toFixed(1)}%)</Text>
            <Text>{money(data.totalCents - data.subtotalCents, data.currency)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{money(data.totalCents, data.currency)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.notes}>
            <Text>{data.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
