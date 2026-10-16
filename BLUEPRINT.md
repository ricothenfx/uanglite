# UangLite — Mini ERP dengan AI Agent

> Portfolio project untuk melamar ke **UangAI (uang.ai)** — "The AI Factory", software house
> berbasis Singapore yang membangun custom AI solutions (ERP → AI agents) untuk klien bisnis.

## 1. Elevator Pitch

**UangLite adalah mini-ERP multi-tenant dengan AI agent yang tidak hanya menjawab, tapi
bertindak**: cek stok, mendeteksi anomali, menyiapkan draft purchase order, dan menyusun
draft email penagihan — semuanya lewat tool-calling dengan human-in-the-loop.

Dibangun untuk mendemonstrasikan persis yang UangAI jual: **aplikasi bisnis production-grade
yang dikirim cepat, dengan AI agen di tengahnya.**

## 2. Kenapa Project Ini Memukau Interviewer UangAI

| Nilai UangAI (dari website mereka) | Buktinya di UangLite |
|---|---|
| "From ERP systems to AI agents" | Mini-ERP nyata + agen LLM sebagai fitur inti |
| "MVP in 6-8 weeks" | Roadmap realistis 8 minggu, terbukti lewat commit history |
| "LLM experts and agentic AI specialists" | Tool-calling, structured output, eval harness |
| Model komersial: build fee + annual license | Arsitektur **multi-tenant** siap white-label |
| Case study: AI inventory & contract management | Modul inventory + agen yang memantau stok |
| "Production-ready systems" | Test, CI/CD, observability, cost tracking LLM |
| "Measurable business impact / ROI" | README bergaya case study dengan metrik bisnis |

## 3. Fitur

### 3.1 Fondasi ERP (modul inti)

- **Auth & Multi-tenant**: organisasi (tenant) terpisah, role `owner`/`staff`,
  isolasi data via Row-Level Security (RLS) PostgreSQL
- **Products & Inventory**: SKU, harga, level stok, stock movements (masuk/keluar),
  alert stok menipis
- **Customers & Suppliers**: kontak, histori transaksi
- **Sales Invoices**: draft → sent → paid / overdue, generate **PDF invoice**
- **Purchase Orders**: draft → sent → received (menambah stok saat received)
- **Dashboard**: revenue, piutang outstanding, invoice jatuh tempo, stok kritis,
  aktivitas terbaru
- **Notifikasi**: in-app untuk stok menipis & invoice overdue

### 3.2 AI Agent — "Pilot" (pembeda utama)

Chat streaming di sidebar dengan **tool-calling** (Vercel AI SDK + Zod schema):

**Read tools (aman, langsung):**
1. `query_stock` — cek stok per SKU / daftar stok menipis
2. `query_invoices` — invoice outstanding / overdue / per customer
3. `business_summary` — ringkasan periode: revenue, piutang, stok kritis
4. `detect_anomalies` — stok negatif, invoice tanpa customer, harga di luar rentang wajar

**Write tools (human-in-the-loop, hasilnya DRAFT bukan eksekusi):**
5. `create_purchase_order_draft` — dari daftar kebutuhan restock → draft PO untuk dikonfirmasi
6. `draft_payment_reminder` — draft email penagihan untuk invoice overdue

> **Poin interview:** agen tulis = selalu draft + konfirmasi manusia (human-in-the-loop).
> Ini jawaban yang benar untuk enterprise adoption, dan menunjukkan pemahaman risiko agen.

Contoh interaksi demo:
- *"Kondisi bisnis minggu ini gimana?"* → summary + grafik + 3 hal yang perlu perhatian
- *"Restock semua produk yang stoknya di bawah minimum"* → tabel kebutuhan → draft PO per supplier
- *"Invoice mana yang overdue dan siapa yang harus ditagih?"* → daftar → draft email per klien

### 3.3 Engineering Credibility (yang sering dilupakan kandidat lain)

- **Agent eval harness**: dataset skenario → assert tool yang terpanggil + parameternya
  benar (vitest), laporan pass-rate di CI
- **Observability & cost tracking**: setiap panggilan LLM dicatat (tokens, biaya, latensi)
  per tenant → admin panel kecil; bahan cerita ROI
- **Testing**: Vitest (unit/logika) + Playwright (e2e happy path: buat invoice, chat agent)
- **CI/CD**: GitHub Actions — lint, typecheck, test, build
- **Deploy**: Docker Compose (app + Postgres) dan/atau Vercel + Neon — demo live yang bisa
  dibuka interviewer
- **Seed data**: generator data demo realistis (5 tenant, ratusan transaksi) agar dashboard
  & agen terlihat hidup

## 4. Arsitektur & Stack

```
┌─────────────────────────────────────────────┐
│ Next.js 15 (App Router, TypeScript)         │
│  ├─ UI: Tailwind + shadcn/ui                │
│  ├─ Chat streaming: Vercel AI SDK           │
│  │    └─ LLM provider (OpenAI-compatible,   │
│  │       mudah diganti — no vendor lock-in) │
│  └─ API routes / server actions             │
├─────────────────────────────────────────────┤
│ PostgreSQL + Drizzle ORM                    │
│  ├─ Multi-tenancy: org_id di semua tabel    │
│  │   + Row-Level Security                   │
│  └─ Tabel log LLM: tokens, cost, latency    │
├─────────────────────────────────────────────┤
│ Vitest + Playwright + GitHub Actions        │
│ Docker Compose / Vercel                     │
└─────────────────────────────────────────────┘
```

**Keputusan stack & justifikasi interview:**
- **Satu bahasa TS end-to-end** → cermin cara kerja UangAI (tim kecil, ship cepat)
- **Vercel AI SDK** → pola agentic (tool-calling, streaming, structured output) multi-provider,
  bukan wrapper satu vendor — mereka jual solusi custom per klien
- **Postgres + RLS** → standar aplikasi bisnis; multi-tenant = sesuai model white-label mereka
- **Drizzle** → SQL-first + type-safe, enak dibahas di whiteboard

## 5. Skema Data (ringkas)

```
organizations (tenant)  id, name, slug, plan
users                   id, email, password_hash
memberships             user_id, org_id, role [owner|staff]

products                org_id, sku, name, price, cost, stock_qty, min_stock
suppliers               org_id, name, email
customers               org_id, name, email

stock_movements         org_id, product_id, qty (+/-), ref_type, ref_id, note

sales_invoices          org_id, customer_id, status, issue_date, due_date, total
sales_invoice_items     invoice_id, product_id, qty, unit_price
purchase_orders         org_id, supplier_id, status, expected_date, total
purchase_order_items    po_id, product_id, qty, unit_cost

llm_call_logs           org_id, tool, model, prompt_tokens, completion_tokens,
                        cost_usd, latency_ms, created_at
agent_drafts            org_id, type [po|email], payload_json, status
                        [pending|approved|rejected], created_by
```

## 6. Roadmap 8 Minggu

| Minggu | Deliverable |
|---|---|
| 1 | Scaffold Next.js + Drizzle, skema DB + migrasi, auth + multi-tenant, CRUD products/customers/suppliers |
| 2 | Sales invoices + PDF, purchase orders, stock movements |
| 3 | Dashboard + notifikasi + polish UI + seed data generator |
| 4 | **Agent v1**: read tools (stock, invoices, summary) + chat streaming UI |
| 5 | **Agent v2**: write-as-draft tools (PO draft, payment reminder) + anomaly detection + human-in-the-loop |
| 6 | Eval harness + observability/cost tracking LLM + admin panel mini |
| 7 | Playwright e2e, GitHub Actions CI, deploy live (Docker/Vercel), demo data |
| 8 | README case study (EN), diagram arsitektur, demo script + video singkat, simulasi interview |

## 7. Story untuk Interview (demo script 5 menit)

1. **Hook (30s)**: "UangAI membangun ERP dan AI agents untuk klien. Saya membangun keduanya
   dalam satu produk — dan menjalankannya multi-tenant, sesuai model lisensi tahunan kalian."
2. **Demo ERP (1m)**: buat invoice → PDF → dashboard bergerak
3. **Demo Agent (2m)**: tanya kondisi bisnis → restock otomatis jadi draft PO → approve
4. **Depth engineering (1m)**: eval harness pass-rate, cost tracking per tenant, RLS
5. **Close (30s)**: README = case study dengan metrik ("agen memangkas waktu restock
   dari X menit ke Y detik")

## 8. Risiko & Mitigasi

- **Scope creep ERP** → kunci modul inti di atas; sisanya masuk "roadmap" di README
  (justru menunjukkan product thinking)
- **Biaya API LLM saat dev** → pakai provider murah / model kecil untuk development;
  cost tracking membatasi kejutan
- **RLS rumit** → pola seragam: semua query lewat helper `withTenant(orgId)` + kebijakan
  RLS dari migrasi pertama, bukan ditambal belakangan
- **Agen halusinasi angka** → semua angka dari tools (bukan dari memori model);
  eval mengunci perilaku ini

## 9. Catatan

- README publik & UI dalam **bahasa Inggris** (audience: interviewer di Singapore);
  dokumen kerja seperti file ini boleh bahasa Indonesia
- Nama "UangLite" adalah homage ke UangAI — sebut itu secara eksplisit di README
  ("inspired by uang.ai's mission"), bukan meniru brand mereka
