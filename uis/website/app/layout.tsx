import type { Metadata } from "next";
import { dmSans, spaceGrotesk } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackFlow | Logistica que llega mas lejos",
  description: "Operaciones de ultima milla y almacen para negocios que necesitan trazabilidad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${dmSans.variable} ${spaceGrotesk.variable}`}><body>{children}</body></html>;
}
