"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

const publicPaths = new Set(["/login", "/register"]);

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status, user, logout } = useAuth();
  const isPublic = publicPaths.has(pathname);

  if (isPublic) return <main className="auth-main">{children}</main>;
  if (status !== "authenticated") {
    return <main className="auth-loading" aria-live="polite">{status === "checking" ? "Comprobando sesión…" : "Redirigiendo al acceso…"}</main>;
  }

  return <>
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark">TF</span> trackflow</Link>
      <p className="side-label">CONTROL TOWER</p>
      <nav>
        <Link className={pathname === "/" ? "active" : ""} href="/">Resumen <span>01</span></Link>
        <Link href="/#solicitudes">Solicitudes <span>12</span></Link>
        <Link href="/#metricas">Métricas</Link>
        <Link className={pathname.startsWith("/suppliers") ? "active" : ""} href="/suppliers">Proveedores</Link>
        <Link className={pathname.startsWith("/account") ? "active" : ""} href="/account/profile">Mi perfil</Link>
      </nav>
      <div className="side-bottom">
        <span className="avatar">{user?.profile.name?.slice(0, 2).toUpperCase() ?? "OP"}</span>
        <span className="account-summary">{user?.profile.name || user?.email}<small>{user?.role}</small></span>
        <button className="logout-button" type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">↪</button>
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </>;
}
