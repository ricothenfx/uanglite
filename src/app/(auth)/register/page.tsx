import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create workspace" };

export default function RegisterPage() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
      <h1 className="mb-1 text-base font-semibold">Create your workspace</h1>
      <p className="mb-5 text-xs text-zinc-500">
        Each company gets an isolated tenant backed by Row-Level Security.
      </p>
      <RegisterForm />
    </div>
  );
}
