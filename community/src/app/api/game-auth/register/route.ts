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

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "El usuario debe tener 3-20 caracteres: letras, números o _." },
      { status: 400 },
    );
  }
  if (password.length < 10 || password.length > 128) {
    return NextResponse.json(
      { error: "La contraseña debe tener entre 10 y 128 caracteres." },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent");
  const registration = await gameBackendFetch(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    userAgent,
  );
  const registrationPayload = await readGameBackendPayload(registration);

  if (!registration.ok) {
    return NextResponse.json(
      { error: registrationPayload.error || "No se pudo crear la cuenta." },
      { status: registration.status >= 400 ? registration.status : 400 },
    );
  }

  // Tras registrar, iniciamos sesión automáticamente para que la web quede
  // enlazada con la misma cuenta que utilizará el cliente de ByeTale.
  const login = await gameBackendFetch(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    userAgent,
  );
  const loginPayload = await readGameBackendPayload(login);

  if (!login.ok || !loginPayload.access_token) {
    return NextResponse.json(
      {
        ok: true,
        registered: true,
        signed_in: false,
        message: registrationPayload.message || "Cuenta creada. Ya puedes iniciar sesión.",
      },
      { status: 201 },
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      registered: true,
      signed_in: true,
      message: "Cuenta de ByeTale creada. Ya puedes usarla también en el juego.",
      account: loginPayload.account,
      character: loginPayload.character ?? null,
      needs_character_creation: Boolean(loginPayload.needs_character_creation),
      world_position: loginPayload.world_position ?? null,
      expires_at: loginPayload.expires_at ?? null,
    },
    { status: 201 },
  );

  response.cookies.set(GAME_SESSION_COOKIE, loginPayload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: loginPayload.expires_at ? new Date(loginPayload.expires_at) : undefined,
  });

  return response;
}
