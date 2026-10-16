"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/provider";
import type { FormState } from "@/lib/form";

export function LoginForm() {
  const { dict } = useI18n();
  const { auth } = dict;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">{auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={auth.emailPlaceholder}
          defaultValue="demo@uanglite.dev"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">{auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          defaultValue="demo1234"
          required
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? auth.signingIn : auth.signIn}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        {auth.noWorkspaceYet}{" "}
        <Link href="/register" className="font-medium text-emerald-700 hover:underline">
          {auth.createOne}
        </Link>
      </p>
    </form>
  );
}
