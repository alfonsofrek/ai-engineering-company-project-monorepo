"use client";

import { type FormEvent, useState } from "react";
import { apiFetch, AuthMe, Profile } from "../../../lib/auth-client";
import { parseResponse, SUPPORT_EMAIL, toUserMessage } from "../../../lib/http";
import { useAuth } from "../../../components/AuthProvider";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return <p className="auth-loading" aria-live="polite">Cargando perfil…</p>;
  return <ProfileEditor key={user.email} user={user} />;
}

function ProfileEditor({ user }: { user: AuthMe }) {
  const [name, setName] = useState(user.profile.name ?? "");
  const [phone, setPhone] = useState(user.profile.phone ?? "");
  const [address, setAddress] = useState(user.profile.address ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/profiles/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, phone: phone || null, address: address || null }),
      });
      const body = await parseResponse<Profile>(response, "No se pudo guardar el perfil.");
      setName(body.name ?? "");
      setPhone(body.phone ?? "");
      setAddress(body.address ?? "");
      setNotice("Perfil actualizado.");
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo guardar el perfil. Inténtalo de nuevo."));
    } finally {
      setIsSaving(false);
    }
  }

  return <>
    <header className="topbar"><div><p className="kicker">CUENTA / PERFIL</p><h1>Mi perfil</h1></div></header>
    <section className="profile-panel">
      <p className="profile-section-label">CREDENCIALES</p>
      <label>Email<input type="email" value={user.email} readOnly /></label>
      <form className="profile-form" onSubmit={save}>
        <p className="profile-section-label">DATOS DE CONTACTO</p>
        <label>Nombre<input autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Teléfono<input autoComplete="tel" type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label>Dirección<input autoComplete="street-address" maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        {error && <p className="auth-alert" role="alert">{error} Si el problema continúa, escribe a <a href={`mailto:${SUPPORT_EMAIL}`}>soporte</a>.</p>}
        {notice && <p className="profile-notice" role="status">{notice}</p>}
        <button className="auth-submit profile-submit" type="submit" disabled={isSaving}>{isSaving ? "Guardando…" : "Guardar cambios"}</button>
      </form>
    </section>
  </>;
}
