import { NextResponse } from "next/server";
import {
  GAME_SESSION_COOKIE,
  gameBackendFetch,
  readGameBackendPayload,
} from "../../../../lib/game-backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios." }, { status: 400 });
  }

  const backend = await gameBackendFetch(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    request.headers.get("user-agent"),
  );
  const payload = await readGameBackendPayload(backend);

  if (!backend.ok || !payload.access_token) {
    return NextResponse.json(
      { error: payload.error || "No se pudo iniciar sesión." },
      { status: backend.status >= 400 ? backend.status : 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    account: payload.account,
    character: payload.character ?? null,
    needs_character_creation: Boolean(payload.needs_character_creation),
    world_position: payload.world_position ?? null,
    expires_at: payload.expires_at ?? null,
  });

  response.cookies.set(GAME_SESSION_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: payload.expires_at ? new Date(payload.expires_at) : undefined,
  });

  return response;
}
