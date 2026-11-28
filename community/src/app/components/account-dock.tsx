"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./account-dock.module.css";

type AccountState = {
  authenticated: boolean;
  account?: { username: string } | null;
};

export default function AccountDock() {
  const [state, setState] = useState<AccountState>({ authenticated: false });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/game-auth/me", { cache: "no-store" });
      const payload = (await response.json()) as AccountState;
      setState(payload);
    } catch {
      setState({ authenticated: false });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("byetale-account-changed", listener);
    return () => window.removeEventListener("byetale-account-changed", listener);
  }, [refresh]);

  const username = state.account?.username || "";

  return (
    <Link
      className={styles.dock}
      href={state.authenticated ? "/account" : "/account?mode=signup"}
      aria-label={state.authenticated ? `Cuenta de ByeTale: ${username}` : "Crear cuenta o iniciar sesión en ByeTale"}
    >
      <span className={`${styles.dot} ${state.authenticated ? styles.online : ""}`} aria-hidden="true" />
      {!ready
        ? "Cuenta ByeTale"
        : state.authenticated
          ? `ByeTale · ${username}`
          : "Crear cuenta / Acceder"}
    </Link>
  );
}
