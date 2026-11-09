"use client";

import Link from "next/link";
import { type FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, parseResponse, toUserMessage } from "../../lib/http";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  return <Suspense fallback={<p className="auth-loading">Cargando…</p>}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tokenRejected, setTokenRejected] = useState(!token);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      await parseResponse(response, "No se pudo actualizar la contraseña.");
      router.replace("/login?reset=1");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 400) {
        setTokenRejected(true);
      } else {
        setError(toUserMessage(requestError, "No se pudo actualizar la contraseña. Inténtalo de nuevo."));
      }
      setIsSubmitting(false);
    }
  }

  if (tokenRejected) {
    return <section className="auth-panel">
      <p className="kicker">TRACKFLOW / ACCESO</p>
      <h1>Enlace no válido</h1>
      <p className="auth-alert" role="alert">
        Este enlace no es válido, ha caducado o ya se ha usado. <Link href="/forgot-password">Solicita un enlace nuevo</Link>.
      </p>
      <p className="auth-switch"><Link href="/login">Volver a iniciar sesión</Link></p>
    </section>;
  }

  return <section className="auth-panel">
    <p className="kicker">TRACKFLOW / ACCESO</p>
    <h1>Elige una nueva contraseña</h1>
    <p className="auth-description">Debe tener al menos {MIN_LENGTH} caracteres.</p>
    {error && <p className="auth-alert" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <label>Nueva contraseña<input autoComplete="new-password" type="password" required minLength={MIN_LENGTH} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Repite la contraseña
        <input autoComplete="new-password" type="password" required maxLength={72} aria-invalid={mismatch} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        {mismatch && <small>Las contraseñas no coinciden.</small>}
      </label>
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar contraseña"}</button>
    </form>
  </section>;
}
