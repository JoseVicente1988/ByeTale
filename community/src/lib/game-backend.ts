export const GAME_BACKEND_URL = (process.env.BYETALE_GAME_BACKEND_URL || "https://backendpersist.vercel.app").replace(/\/$/, "");
export const GAME_SESSION_COOKIE = "byetale_game_session";

export type GameAccountPayload = {
  account?: { id: string; username: string } | null;
  character?: {
    id: string;
    name: string | null;
    class_id: string | null;
    appearance_id: string | null;
  } | null;
  needs_character_creation?: boolean;
  world_position?: {
    map_id: string;
    x: number;
    y: number;
    direction: string;
  } | null;
  session?: { id: string; expires_at: string } | null;
  expires_at?: string;
  access_token?: string;
  error?: string;
  message?: string;
  ok?: boolean;
};

export async function gameBackendFetch(
  path: string,
  init: RequestInit = {},
  userAgent?: string | null,
) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (userAgent) headers.set("User-Agent", userAgent);

  return fetch(`${GAME_BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function readGameBackendPayload(response: Response): Promise<GameAccountPayload> {
  try {
    return (await response.json()) as GameAccountPayload;
  } catch {
    return { error: "Respuesta inválida del servidor del juego." };
  }
}
