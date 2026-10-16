import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.register };
}

export default async function RegisterPage() {
  const { auth } = await getDictionary();
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <h1 className="mb-1 text-base font-semibold">{auth.registerTitle}</h1>
      <p className="mb-5 text-xs text-zinc-500">{auth.registerDesc}</p>
      <RegisterForm />
    </div>
  );
}
