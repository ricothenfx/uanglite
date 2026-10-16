import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.signIn };
}

export default async function LoginPage() {
  const { auth } = await getDictionary();
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <h1 className="mb-1 text-base font-semibold">{auth.signInTitle}</h1>
      <p className="mb-5 text-xs text-zinc-500">{auth.signInDesc}</p>
      <LoginForm />
    </div>
  );
}
