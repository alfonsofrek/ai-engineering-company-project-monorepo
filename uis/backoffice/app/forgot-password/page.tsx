"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { parseResponse, toUserMessage } from "../../lib/http";

const CONFIRMATION = "Si ese email está registrado, recibirás un enlace para restablecer la contraseña en unos minutos. Revisa también la carpeta de spam.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isSent) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await parseResponse(response, "No se pudo enviar la solicitud.");
      // The API answers the same for every address, and so does the page.
      setIsSent(true);
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo enviar la solicitud. Inténtalo de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="auth-panel">
    <p className="kicker">TRACKFLOW / ACCESO</p>
    <h1>¿Olvidaste tu contraseña?</h1>
    <p className="auth-description">Escribe el email de tu cuenta y te enviaremos un enlace para elegir una nueva.</p>
    {isSent && <p className="auth-notice" role="status">{CONFIRMATION}</p>}
    {error && <p className="auth-alert" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <label>Email<input autoComplete="email" type="email" required value={email} disabled={isSent} onChange={(event) => setEmail(event.target.value)} /></label>
      <button className="auth-submit" type="submit" disabled={isSubmitting || isSent}>
        {isSubmitting ? "Enviando…" : isSent ? "Enlace solicitado" : "Enviar enlace"}
      </button>
    </form>
    <p className="auth-switch">¿Ya la recuerdas? <Link href="/login">Volver a iniciar sesión</Link></p>
  </section>;
}
