import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <h1 className="mb-1 text-base font-semibold">Welcome back</h1>
      <p className="mb-5 text-xs text-zinc-500">
        Demo tenant pre-filled: demo@uanglite.dev / demo1234
      </p>
      <LoginForm />
    </div>
  );
}
