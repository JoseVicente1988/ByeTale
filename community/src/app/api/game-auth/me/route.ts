import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GAME_SESSION_COOKIE,
  gameBackendFetch,
  readGameBackendPayload,
} from "../../../../lib/game-backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GAME_SESSION_COOKIE)?.value ?? "";

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const backend = await gameBackendFetch(
    "/api/web-auth/me",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    request.headers.get("user-agent"),
  );
  const payload = await readGameBackendPayload(backend);

  if (!backend.ok) {
    const response = NextResponse.json({ authenticated: false }, { status: 200 });
    response.cookies.set(GAME_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json({
    authenticated: true,
    account: payload.account,
    character: payload.character ?? null,
    needs_character_creation: Boolean(payload.needs_character_creation),
    session: payload.session ?? null,
  });
}
