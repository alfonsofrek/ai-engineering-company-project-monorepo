"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage, TOKEN_KEY } from "../../lib/auth-client";

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
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "No se pudo iniciar sesión."));
      localStorage.setItem(TOKEN_KEY, body.access_token as string);
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/";
      router.replace(destination);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servicio.");
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
