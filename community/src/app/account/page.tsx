"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { neon } from "../../lib/neon-client";
import { authenticateWithEmail, authErrorMessage, type AuthMode } from "../../lib/auth";
import styles from "./account.module.css";

export default function AccountPage() {
  const session = neon.auth.useSession();
  const user = session.data?.user ?? null;
  const [mode, setMode] = useState<AuthMode>("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "signin" ? "signin" : "signup");
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      await authenticateWithEmail(mode, email, password, name);
      setNotice(mode === "signup"
        ? "Cuenta creada. Tu sesión ya puede usarse para publicar en el foro."
        : "Sesión iniciada correctamente.");

      window.setTimeout(() => {
        window.location.assign("/forum");
      }, 350);
    } catch (authError) {
      setError(authErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await neon.auth.signOut();
      setNotice("Sesión cerrada.");
    } catch (signOutError) {
      setError(authErrorMessage(signOutError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.copy}>
          <span className={styles.eyebrow}>Cuenta ByeTale Community</span>
          <h1>Entra en la conversación.</h1>
          <p>
            Puedes leer el contenido público sin cuenta. Para abrir hilos, responder o apoyar propuestas necesitas
            una sesión identificada. La cuenta de comunidad queda separada por ahora de la cuenta local del juego.
          </p>

          <div className={styles.rules}>
            <div className={styles.rule}><b>01</b><span>Leer el foro: público.</span></div>
            <div className={styles.rule}><b>02</b><span>Abrir hilos y responder: solo usuarios autenticados.</span></div>
            <div className={styles.rule}><b>03</b><span>Las políticas de Neon comprueban también la identidad del autor.</span></div>
          </div>

          <Link className={styles.back} href="/">← Volver a ByeTale</Link>
        </section>

        <section className={styles.card} aria-live="polite">
          <div className={styles.cardHead}>
            <h2>{user ? "Tu cuenta" : mode === "signup" ? "Crear cuenta" : "Acceder"}</h2>
            <p>{user ? "Sesión activa en ByeTale Community." : "Email + contraseña. Sin cuenta no se puede publicar."}</p>
          </div>

          {user ? (
            <div className={styles.session}>
              <div className={styles.identity}>
                <strong>{user.name || "Miembro ByeTale"}</strong>
                <span>{user.email}</span>
              </div>
              <div className={styles.sessionActions}>
                <Link className={`${styles.button} ${styles.primary}`} href="/forum">Ir al foro</Link>
                <button className={styles.button} onClick={() => void signOut()} disabled={busy}>Cerrar sesión</button>
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
                  Acceder
                </button>
              </div>

              <form className={styles.form} onSubmit={handleAuth}>
                {mode === "signup" && (
                  <label>
                    <span>Nombre visible</span>
                    <input name="name" minLength={2} maxLength={40} autoComplete="nickname" required />
                  </label>
                )}
                <label>
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                </label>
                <button className={`${styles.button} ${styles.primary}`} disabled={busy}>
                  {busy ? "Procesando…" : mode === "signup" ? "Crear cuenta y entrar" : "Entrar"}
                </button>
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
