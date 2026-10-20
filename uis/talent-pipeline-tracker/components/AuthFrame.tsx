"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

const publicPaths = new Set(["/login", "/register"]);

export function AuthFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  if (publicPaths.has(pathname)) return <main className="auth-main">{children}</main>;
  if (status !== "authenticated") {
    return <main className="auth-wait" aria-live="polite">{status === "checking" ? "Comprobando sesión…" : "Redirigiendo al acceso…"}</main>;
  }
  return <><Header /><main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main></>;
}
