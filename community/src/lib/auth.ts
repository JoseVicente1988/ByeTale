import { neon } from "./neon-client";

export type AuthMode = "signin" | "signup";

export function authErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Ha ocurrido un error inesperado.";
}

export async function authenticateWithEmail(
  mode: AuthMode,
  email: string,
  password: string,
  name = "",
) {
  const result = mode === "signup"
    ? await neon.auth.signUp.email({ email, password, name: name || email.split("@")[0] })
    : await neon.auth.signIn.email({ email, password });

  if (result.error) throw result.error;
  return result.data;
}
