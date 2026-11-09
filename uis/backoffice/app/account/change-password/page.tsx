"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { apiFetch } from "../../../lib/auth-client";
import { parseResponse, toUserMessage } from "../../../lib/http";

const MIN_LENGTH = 8;

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const mismatch = confirmation.length > 0 && password !== confirmation;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password.length < MIN_LENGTH) return setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    if (password !== confirmation) return setError("La nueva contraseña y la confirmación no coinciden.");
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: password }),
      });
      await parseResponse(response, "No se pudo cambiar la contraseña.");
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setNotice("Contraseña actualizada. Úsala la próxima vez que inicies sesión.");
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo cambiar la contraseña. Inténtalo de nuevo."));
    } finally {
      setIsSaving(false);
    }
  }

  return <>
    <header className="topbar"><div><p className="kicker">CUENTA / SEGURIDAD</p><h1>Cambiar contraseña</h1></div></header>
    <section className="profile-panel password-panel">
      <form className="profile-form" onSubmit={save}>
        <p className="profile-section-label">CREDENCIALES</p>
        <label>Contraseña actual<input autoComplete="current-password" type="password" required maxLength={72} value={current} onChange={(event) => setCurrent(event.target.value)} /></label>
        <label>Nueva contraseña<input autoComplete="new-password" type="password" required minLength={MIN_LENGTH} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Repite la nueva contraseña
          <input autoComplete="new-password" type="password" required maxLength={72} aria-invalid={mismatch} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        {mismatch && <p className="auth-alert" role="alert">La nueva contraseña y la confirmación no coinciden.</p>}
        {error && <p className="auth-alert" role="alert">{error}</p>}
        {notice && <p className="profile-notice" role="status">{notice}</p>}
        <button className="auth-submit profile-submit" type="submit" disabled={isSaving || mismatch}>{isSaving ? "Guardando…" : "Cambiar contraseña"}</button>
      </form>
      <p className="auth-switch">¿No recuerdas la actual? <Link href="/forgot-password">Restablécela por email</Link></p>
    </section>
  </>;
}
