import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./auth.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthFrame } from "@/components/AuthFrame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talent Pipeline Tracker | TrackFlow",
  description: "Herramienta interna de People & Talent de TrackFlow para gestionar el pipeline de candidatos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <AuthProvider><AuthFrame>{children}</AuthFrame></AuthProvider>
      </body>
    </html>
  );
}
