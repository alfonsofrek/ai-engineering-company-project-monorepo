"use client";

import { type FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authFetch, AuthMe, errorMessage } from "@/lib/auth-client";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return <ProfileEditor key={user.email} user={user} />;
}

function ProfileEditor({ user }: { user: AuthMe }) {
  const [name, setName] = useState(user.profile.name ?? "");
  const [phone, setPhone] = useState(user.profile.phone ?? "");
  const [address, setAddress] = useState(user.profile.address ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await authFetch("/api/profiles/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, phone: phone || null, address: address || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "No se pudo guardar el perfil."));
      setName(body.name ?? "");
      setPhone(body.phone ?? "");
      setAddress(body.address ?? "");
      setNotice("Perfil actualizado.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servicio.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-800">CUENTA / PERFIL</p>
    <h1 className="mt-2 text-2xl font-semibold text-slate-900">Mi perfil</h1>
    <div className="mt-6 grid gap-1.5 text-sm font-medium">Email<input className="auth-input" type="email" value={user.email} readOnly /></div>
    <form className="mt-6 grid gap-4 border-t border-slate-200 pt-6" onSubmit={submit}>
      <label className="grid gap-1.5 text-sm font-medium">Nombre<input className="auth-input" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Teléfono<input className="auth-input" autoComplete="tel" type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Dirección<input className="auth-input" autoComplete="street-address" maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-700" role="status">{notice}</p>}
      <button className="auth-button justify-self-start" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  </section>;
}
