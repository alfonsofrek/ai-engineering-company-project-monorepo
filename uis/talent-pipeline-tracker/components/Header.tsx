import Link from "next/link";

export function Header() {
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
        </nav>
      </div>
    </header>
  );
}
