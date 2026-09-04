import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByeTale Community",
  description:
    "Centro oficial de comunidad y desarrollo de ByeTale: roadmap, ideas, testing, voces y directos."
};

/**
 * Root layout for the ByeTale community site.
 *
 * The web app intentionally stays independent from the Godot runtime while
 * living in the same repository. This lets Vercel build only /community and
 * keeps the game client/server files outside the web deployment surface.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="mist" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
