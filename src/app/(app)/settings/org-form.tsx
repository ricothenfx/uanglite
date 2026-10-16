"use client";

import { useActionState } from "react";
import { updateOrgAction } from "@/actions/org";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/provider";
import type { FormState } from "@/lib/form";

export function OrgForm({
  name,
  currency,
  taxBps,
  canEdit,
}: {
  name: string;
  currency: string;
  taxBps: number;
  canEdit: boolean;
}) {
  const { dict } = useI18n();
  const s = dict.settings;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateOrgAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{s.companyName}</Label>
          <Input id="name" name="name" defaultValue={name} disabled={!canEdit} required />
        </div>
        <div>
          <Label htmlFor="currency-display">{s.currency}</Label>
          <Input id="currency-display" value={currency} disabled />
        </div>
      </div>
      <div className="max-w-[200px]">
        <Label htmlFor="taxPercent">{s.taxRate}</Label>
        <Input
          id="taxPercent"
          name="taxBps"
          type="number"
          min={0}
          max={100}
          step={0.1}
          defaultValue={(taxBps / 100).toFixed(1)}
          disabled={!canEdit}
        />
        <p className="mt-1 text-[11px] text-zinc-400">{s.taxBpsHint}</p>
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.ok}</p>
      ) : null}
      {canEdit ? (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? dict.common.saving : s.saveWorkspace}
        </Button>
      ) : (
        <p className="text-xs text-zinc-500">{s.onlyOwners}</p>
      )}
    </form>
  );
}
