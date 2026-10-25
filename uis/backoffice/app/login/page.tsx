"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "../../lib/auth-client";
import { ApiError, parseResponse, toUserMessage } from "../../lib/http";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await parseResponse<{ access_token?: string }>(response, "No se pudo iniciar sesión.");
      if (!body?.access_token) throw new ApiError("El servidor no ha devuelto una sesión válida. Inténtalo de nuevo.", 502);
      localStorage.setItem(TOKEN_KEY, body.access_token);
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/";
      router.replace(destination);
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 401
        ? "Email o contraseña incorrectos."
        : toUserMessage(requestError, "No se pudo iniciar sesión. Inténtalo de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="auth-panel">
    <p className="kicker">TRACKFLOW / CONTROL TOWER</p>
    <h1>Iniciar sesión</h1>
    <p className="auth-description">Accede a las operaciones de tu equipo.</p>
    {error && <p className="auth-alert" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <label>Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Contraseña<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Validando…" : "Entrar"}</button>
    </form>
    <p className="auth-switch">¿Aún no tienes acceso? <Link href="/register">Crear cuenta</Link></p>
  </section>;
}
