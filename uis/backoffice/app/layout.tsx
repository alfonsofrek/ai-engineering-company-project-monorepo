import type { Metadata } from "next";
import { AppFrame } from "../components/AppFrame";
import { AuthProvider } from "../components/AuthProvider";
import { TelemetryBoot } from "../components/TelemetryBoot";
import { dmSans, spaceGrotesk } from "./fonts";
import "./globals.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "Control tower | TrackFlow",
  description: "Backoffice de onboarding, proveedores y operaciones de TrackFlow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${dmSans.variable} ${spaceGrotesk.variable}`}><body><TelemetryBoot /><AuthProvider><AppFrame>{children}</AppFrame></AuthProvider></body></html>;
}
