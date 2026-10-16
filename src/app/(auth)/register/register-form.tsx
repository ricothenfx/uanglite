"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/provider";
import type { FormState } from "@/lib/form";

export function RegisterForm() {
  const { dict } = useI18n();
  const { auth } = dict;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="orgName">{auth.companyName}</Label>
        <Input id="orgName" name="orgName" placeholder={auth.companyPlaceholder} required />
      </div>
      <div>
        <Label htmlFor="currency">{auth.currency}</Label>
        <Select id="currency" name="currency" defaultValue="SGD">
          <option value="SGD">{auth.currencySgd}</option>
          <option value="IDR">{auth.currencyIdr}</option>
          <option value="MYR">{auth.currencyMyr}</option>
          <option value="USD">{auth.currencyUsd}</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="name">{auth.yourName}</Label>
        <Input id="name" name="name" placeholder={auth.namePlaceholder} required />
      </div>
      <div>
        <Label htmlFor="email">{auth.workEmail}</Label>
        <Input id="email" name="email" type="email" placeholder={auth.emailPlaceholder} required />
      </div>
      <div>
        <Label htmlFor="password">{auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={auth.passwordHint}
          minLength={8}
          required
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? auth.registering : auth.register}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        {auth.alreadyRegistered}{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          {auth.signIn}
        </Link>
      </p>
    </form>
  );
}
