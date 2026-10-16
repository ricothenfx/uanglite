import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";

const PUBLIC_PATHS = ["/login", "/register"];
const OPEN_PATHS = ["/faq"];

async function isAuthed(req: NextRequest): Promise<boolean> {
  const seal = req.cookies.get("uanglite_session")?.value;
  if (!seal) return false;
  const password = process.env.SESSION_PASSWORD ?? "";
  try {
    const data = await unsealData<{ userId?: string }>(seal, { password });
    return Boolean(data.userId);
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const authed = await isAuthed(req);
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isOpen = OPEN_PATHS.some((p) => path.startsWith(p));

  if (!authed && !isPublic && !isOpen) {
    const url = new URL("/login", req.nextUrl);
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
