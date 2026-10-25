"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-slate-900">TrackFlow · People &amp; Talent</span>
          <span className="text-xs text-slate-500">Talent Pipeline Tracker</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Candidatos
          </Link>
          <Link
            href="/candidates/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
          >
            Registrar candidato
          </Link>
          <Link href="/account/profile" className="text-slate-600 hover:text-slate-900">
            {user?.profile.name || "Mi perfil"}
          </Link>
          <button type="button" onClick={logout} className="text-slate-600 hover:text-slate-900">
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
