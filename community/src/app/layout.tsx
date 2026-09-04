import type { Metadata } from "next";
import AccountDock from "./components/account-dock";
import "./globals.css";
import "./scene-runtime.css";
import "./world-backgrounds.css";

export const metadata: Metadata = {
  title: {
    default: "ByeTale Community",
    template: "%s · ByeTale",
  },
  description:
    "Comunidad y desarrollo de ByeTale, RPG 2D multijugador en Godot 4: mapas, combate, quests, testing, ideas y directos.",
  icons: {
    icon: "/byetale-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <AccountDock />
      </body>
    </html>
  );
}
