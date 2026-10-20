"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage, TOKEN_KEY } from "@/lib/auth-client";

type FieldErrors = Partial<Record<"email" | "password" | "confirm" | "name" | "phone" | "address", string>>;

function validationErrors(body: unknown): FieldErrors {
  if (typeof body !== "object" || body === null || !("detail" in body) || !Array.isArray(body.detail)) return {};
  const errors: FieldErrors = {};
  for (const issue of body.detail) {
    if (typeof issue !== "object" || issue === null || !Array.isArray(issue.loc)) continue;
    const field = String(issue.loc.at(-1) ?? "");
    if (["email", "password", "name", "phone", "address"].includes(field)) {
      errors[field as keyof FieldErrors] = String(issue.msg ?? "Valor inválido");
    }
  }
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ confirm: "Las contraseñas no coinciden." });
      return;
    }
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const registration = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(address.trim() ? { address: address.trim() } : {}),
        }),
      });
      const registrationBody = await registration.json();
      if (!registration.ok) {
        setFieldErrors(validationErrors(registrationBody));
        throw new Error(errorMessage(registrationBody, "No se pudo crear la cuenta."));
      }
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const loginBody = await login.json();
      if (!login.ok) throw new Error(errorMessage(loginBody, "La cuenta se creó, pero no se pudo iniciar sesión."));
      localStorage.setItem(TOKEN_KEY, loginBody.access_token as string);
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servicio.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="auth-panel auth-panel-wide">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-800">TRACKFLOW / PEOPLE &amp; TALENT</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-900">Crear acceso</h1>
    <p className="mt-2 text-sm text-slate-500">Registra tus credenciales y datos de contacto.</p>
    {error && <p className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
    <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <label className="grid gap-1.5 text-sm font-medium">Email *<input className="auth-input" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} />{fieldErrors.email && <small className="text-red-700">{fieldErrors.email}</small>}</label>
      <label className="grid gap-1.5 text-sm font-medium">Nombre<input className="auth-input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(fieldErrors.name)} />{fieldErrors.name && <small className="text-red-700">{fieldErrors.name}</small>}</label>
      <label className="grid gap-1.5 text-sm font-medium">Contraseña *<input className="auth-input" autoComplete="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} />{fieldErrors.password && <small className="text-red-700">{fieldErrors.password}</small>}</label>
      <label className="grid gap-1.5 text-sm font-medium">Repetir contraseña *<input className="auth-input" autoComplete="new-password" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-invalid={Boolean(fieldErrors.confirm)} />{fieldErrors.confirm && <small className="text-red-700">{fieldErrors.confirm}</small>}</label>
      <label className="grid gap-1.5 text-sm font-medium">Teléfono<input className="auth-input" autoComplete="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} />{fieldErrors.phone && <small className="text-red-700">{fieldErrors.phone}</small>}</label>
      <label className="grid gap-1.5 text-sm font-medium">Dirección<input className="auth-input" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} aria-invalid={Boolean(fieldErrors.address)} />{fieldErrors.address && <small className="text-red-700">{fieldErrors.address}</small>}</label>
      <button className="auth-button sm:col-span-2" disabled={busy}>{busy ? "Creando cuenta…" : "Crear cuenta"}</button>
    </form>
    <p className="mt-5 text-sm text-slate-500">¿Ya tienes cuenta? <Link className="font-semibold text-teal-800 underline underline-offset-4" href="/login">Iniciar sesión</Link></p>
  </section>;
}
