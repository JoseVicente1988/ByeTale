"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "./account.module.css";

type AuthMode = "signup" | "signin";

type GameSession = {
  authenticated: boolean;
  account?: { id: string; username: string } | null;
  character?: {
    id: string;
    name: string | null;
    class_id: string | null;
    appearance_id: string | null;
  } | null;
  needs_character_creation?: boolean;
  session?: { id: string; expires_at: string } | null;
};

type AuthResponse = GameSession & {
  ok?: boolean;
  error?: string;
  message?: string;
  signed_in?: boolean;
};

function sessionDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AccountPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [session, setSession] = useState<GameSession>({ authenticated: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/game-auth/me", { cache: "no-store" });
      const payload = (await response.json()) as GameSession;
      setSession(payload);
    } catch {
      setSession({ authenticated: false });
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "signin" ? "signin" : "signup");
    void loadSession();
  }, [loadSession]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (mode === "signup" && password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`/api/game-auth/${mode === "signup" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as AuthResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "No se pudo completar la operación.");
      }

      setNotice(
        mode === "signup"
          ? "Cuenta de ByeTale creada. Estas mismas credenciales funcionan en el juego."
          : "Sesión iniciada en la web.",
      );
      await loadSession();
      window.dispatchEvent(new Event("byetale-account-changed"));
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetch("/api/game-auth/logout", { method: "POST" });
      setSession({ authenticated: false });
      setNotice("Sesión web cerrada. Tu sesión dentro del juego no se modifica.");
      window.dispatchEvent(new Event("byetale-account-changed"));
    } catch {
      setError("No se pudo cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  const username = session.account?.username ?? "";
  const character = session.character ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.worldGlow} aria-hidden="true" />
      <div className={styles.shell}>
        <section className={styles.copy}>
          <span className={styles.eyebrow}>Cuenta oficial de ByeTale</span>
          <h1>Tu puerta de entrada a Valdoria.</h1>
          <p>
            Regístrate aquí una sola vez y utiliza el mismo usuario y contraseña en el cliente de ByeTale.
            La web ya habla directamente con el sistema real de cuentas del juego.
          </p>

          <div className={styles.accountFlow}>
            <div className={styles.flowItem}>
              <b>01</b>
              <div><strong>Crea tu cuenta</strong><span>Usuario único de 3-20 caracteres.</span></div>
            </div>
            <div className={styles.flowItem}>
              <b>02</b>
              <div><strong>Descarga ByeTale</strong><span>La última build pública está disponible desde la portada.</span></div>
            </div>
            <div className={styles.flowItem}>
              <b>03</b>
              <div><strong>Entra al juego</strong><span>Tu personaje se crea desde el cliente en el primer acceso.</span></div>
            </div>
          </div>

          <div className={styles.copyLinks}>
            <Link className={styles.back} href="/">← Volver a ByeTale</Link>
            <Link className={styles.back} href="/#descargar">Descargar juego ↓</Link>
          </div>
        </section>

        <section className={styles.card} aria-live="polite">
          <div className={styles.cardAccent} aria-hidden="true" />
          <div className={styles.cardHead}>
            <span className={styles.cardKicker}>BYETALE ACCOUNT</span>
            <h2>
              {sessionLoading
                ? "Comprobando sesión…"
                : session.authenticated
                  ? "Cuenta conectada"
                  : mode === "signup"
                    ? "Crear cuenta"
                    : "Iniciar sesión"}
            </h2>
            <p>
              {session.authenticated
                ? "Identidad enlazada con el servidor del juego."
                : "La cuenta que crees aquí es la misma que usarás dentro de ByeTale."}
            </p>
          </div>

          {sessionLoading ? (
            <div className={styles.loadingBox}>
              <span className={styles.spinner} aria-hidden="true" />
              Conectando con los servicios de ByeTale…
            </div>
          ) : session.authenticated ? (
            <div className={styles.session}>
              <div className={styles.identity}>
                <div className={styles.avatar} aria-hidden="true">
                  {username.slice(0, 1).toUpperCase() || "B"}
                </div>
                <div>
                  <small>CUENTA</small>
                  <strong>{username}</strong>
                  <span>Sesión web segura</span>
                </div>
              </div>

              <div className={styles.characterPanel}>
                <div className={styles.characterHead}>
                  <span>PERSONAJE</span>
                  <i className={character ? styles.statusOnline : styles.statusPending}>
                    {character ? "Vinculado" : "Pendiente"}
                  </i>
                </div>
                {character ? (
                  <div className={styles.characterData}>
                    <strong>{character.name || "Personaje ByeTale"}</strong>
                    <span>Clase: {character.class_id || "Sin definir"}</span>
                  </div>
                ) : (
                  <p>
                    Todavía no hay personaje asociado. Abre el juego con esta cuenta para completar la creación.
                  </p>
                )}
              </div>

              <div className={styles.sessionMeta}>
                <div><small>Cuenta</small><span>Activa</span></div>
                <div><small>Sesión web</small><span>Protegida</span></div>
                <div><small>Caduca</small><span>{sessionDate(session.session?.expires_at)}</span></div>
              </div>

              <div className={styles.sessionActions}>
                <Link className={`${styles.button} ${styles.primary}`} href="/#descargar">Descargar ByeTale</Link>
                <Link className={styles.button} href="/forum">Ir al foro</Link>
                <button className={styles.button} type="button" onClick={() => void signOut()} disabled={busy}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={`${styles.tab} ${mode === "signup" ? styles.tabActive : ""}`}
                  onClick={() => { setMode("signup"); setError(""); setNotice(""); }}
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${mode === "signin" ? styles.tabActive : ""}`}
                  onClick={() => { setMode("signin"); setError(""); setNotice(""); }}
                >
                  Iniciar sesión
                </button>
              </div>

              <form className={styles.form} onSubmit={handleAuth}>
                <label>
                  <span>Usuario de ByeTale</span>
                  <input
                    name="username"
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    autoComplete="username"
                    placeholder="ej. aventurero_87"
                    required
                  />
                  {mode === "signup" && <small>3-20 caracteres · letras, números y _</small>}
                </label>

                <label>
                  <span>Contraseña</span>
                  <div className={styles.passwordField}>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      minLength={mode === "signup" ? 10 : 1}
                      maxLength={128}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder={mode === "signup" ? "Mínimo 10 caracteres" : "Tu contraseña"}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </label>

                {mode === "signup" && (
                  <label>
                    <span>Repite la contraseña</span>
                    <input
                      name="passwordConfirm"
                      type={showPassword ? "text" : "password"}
                      minLength={10}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      required
                    />
                  </label>
                )}

                <button className={`${styles.button} ${styles.primary} ${styles.submit}`} disabled={busy}>
                  {busy
                    ? "Conectando…"
                    : mode === "signup"
                      ? "Crear mi cuenta de ByeTale"
                      : "Entrar en mi cuenta"}
                </button>

                <p className={styles.securityNote}>
                  La contraseña se envía al backend oficial de ByeTale y la sesión web se guarda en una cookie HttpOnly.
                </p>
              </form>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {notice && <div className={styles.notice}>{notice}</div>}
        </section>
      </div>
    </main>
  );
}
