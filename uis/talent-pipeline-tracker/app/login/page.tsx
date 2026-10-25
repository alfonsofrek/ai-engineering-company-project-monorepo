"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/auth-client";
import { ApiError, parseResponse, toUserMessage } from "@/lib/http";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await parseResponse<{ access_token?: string }>(response, "No se pudo iniciar sesión.");
      if (!body?.access_token) throw new ApiError("El servidor no ha devuelto una sesión válida. Inténtalo de nuevo.", 502);
      localStorage.setItem(TOKEN_KEY, body.access_token);
      const requested = new URLSearchParams(window.location.search).get("next");
      router.replace(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/");
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 401
        ? "Email o contraseña incorrectos."
        : toUserMessage(requestError, "No se pudo iniciar sesión. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  return <section className="auth-panel">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-800">TRACKFLOW / PEOPLE &amp; TALENT</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-900">Iniciar sesión</h1>
    <p className="mt-2 text-sm text-slate-500">Accede al pipeline de candidatos.</p>
    {error && <p className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      <label className="grid gap-1.5 text-sm font-medium">Email<input className="auth-input" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Contraseña<input className="auth-input" autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="auth-button" disabled={busy}>{busy ? "Validando…" : "Entrar"}</button>
    </form>
    <p className="mt-5 text-sm text-slate-500">¿Aún no tienes cuenta? <Link className="font-semibold text-teal-800 underline underline-offset-4" href="/register">Crear cuenta</Link></p>
  </section>;
}
