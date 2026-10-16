import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-zinc-500">
        The page you are looking for does not exist or you do not have access.
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
