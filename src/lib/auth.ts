import { cookies } from "next/headers";
import { config } from "./config";
import { NextRequest, NextResponse } from "next/server";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.auth.cookieName);
  return token?.value === config.auth.password;
}

export async function requireAuth(): Promise<NextResponse | null> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireAuthRequest(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(config.auth.cookieName);
  if (token?.value !== config.auth.password) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
