import { logoutAction } from "@/actions/auth";
import { requireAuth } from "@/lib/auth";

export async function UserChip() {
  const auth = await requireAuth();
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 text-right">
        <p className="truncate text-xs font-medium text-zinc-800">
          {auth.org.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {auth.user.name} · {auth.role}
        </p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
