import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GAME_SESSION_COOKIE,
  gameBackendFetch,
} from "../../../../lib/game-backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GAME_SESSION_COOKIE)?.value ?? "";

  if (token) {
    await gameBackendFetch(
      "/api/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      request.headers.get("user-agent"),
    ).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GAME_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
