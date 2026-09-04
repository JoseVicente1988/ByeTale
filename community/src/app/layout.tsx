import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ByeTale Community",
    template: "%s · ByeTale"
  },
  description:
    "Centro oficial de comunidad y desarrollo de ByeTale: roadmap, ideas, testing, voces y directos.",
  icons: {
    icon: "/byetale-icon.svg"
  }
};

/**
 * Root layout for the ByeTale community site.
 *
 * The web app lives under /community in the same repository as the Godot game.
 * Vercel can therefore build the web independently without exposing game or
 * server files as part of the application bundle.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
