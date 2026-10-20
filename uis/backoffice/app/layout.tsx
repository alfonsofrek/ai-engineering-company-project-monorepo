import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control tower | TrackFlow",
  description: "Backoffice de onboarding, proveedores y operaciones de TrackFlow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">TF</span> trackflow</Link><p className="side-label">CONTROL TOWER</p><nav><Link className="active" href="/">Resumen <span>01</span></Link><a href="#solicitudes">Solicitudes <span>12</span></a><a href="#metricas">Metricas</a><Link href="/suppliers">Proveedores</Link></nav><div className="side-bottom"><span className="avatar">OP</span><span>Operaciones<br /><small>Admin</small></span></div></aside><main className="main-content">{children}</main></body></html>;
}
