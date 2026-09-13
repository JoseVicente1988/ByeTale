"use client";

import Link from "next/link";
import { neon } from "../../lib/neon-client";
import styles from "./account-dock.module.css";

export default function AccountDock() {
  const session = neon.auth.useSession();
  const user = session.data?.user ?? null;

  return (
    <Link className={styles.dock} href={user ? "/account" : "/account?mode=signup"}>
      <span className={`${styles.dot} ${user ? styles.online : ""}`} aria-hidden="true" />
      {user ? `Cuenta · ${user.name || user.email || "Miembro"}` : "Crear cuenta / Acceder"}
    </Link>
  );
}
