"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="orgName">Company name</Label>
        <Input id="orgName" name="orgName" placeholder="Acme Trading Pte Ltd" required />
      </div>
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" name="currency" defaultValue="SGD">
          <option value="SGD">SGD — Singapore Dollar</option>
          <option value="IDR">IDR — Indonesian Rupiah</option>
          <option value="MYR">MYR — Malaysian Ringgit</option>
          <option value="USD">USD — US Dollar</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" placeholder="Jane Tan" required />
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
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
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
