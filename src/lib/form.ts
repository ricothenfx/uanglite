export type FormState = { error?: string; ok?: string };

export function centsFromInput(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}
