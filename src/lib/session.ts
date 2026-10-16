import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const COOKIE_NAME = "uanglite_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionData = {
  userId?: string;
  orgId?: string;
  role?: "owner" | "staff";
  email?: string;
  name?: string;
};

function sessionPassword(): string {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_PASSWORD must be set and at least 32 characters long.",
    );
  }
  return password;
}

export async function getSession(): Promise<SessionData> {
  const store = await cookies();
  const seal = store.get(COOKIE_NAME)?.value;
  if (!seal) return {};
  try {
    return await unsealData<SessionData>(seal, {
      password: sessionPassword(),
    });
  } catch {
    return {};
  }
}

export async function writeSession(data: SessionData): Promise<void> {
  const store = await cookies();
  const seal = await sealData(data, {
    password: sessionPassword(),
    ttl: MAX_AGE_SECONDS,
  });
  store.set(COOKIE_NAME, seal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
