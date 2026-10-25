"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage, TOKEN_KEY } from "../../lib/auth-client";

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
  const [fields, setFields] = useState({ email: "", password: "", confirm: "", name: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (fields.password !== fields.confirm) {
      setFieldErrors({ confirm: "Las contraseñas no coinciden." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        email: fields.email.trim(),
        password: fields.password,
        ...(fields.name.trim() ? { name: fields.name.trim() } : {}),
        ...(fields.phone.trim() ? { phone: fields.phone.trim() } : {}),
        ...(fields.address.trim() ? { address: fields.address.trim() } : {}),
      };
      const registration = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const registrationBody = await registration.json();
      if (!registration.ok) {
        setFieldErrors(validationErrors(registrationBody));
        throw new Error(errorMessage(registrationBody, "No se pudo crear la cuenta."));
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      const loginBody = await login.json();
      if (!login.ok) throw new Error(errorMessage(loginBody, "La cuenta se creó, pero no se pudo iniciar sesión."));
      localStorage.setItem(TOKEN_KEY, loginBody.access_token as string);
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servicio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="auth-panel auth-panel-wide">
    <p className="kicker">TRACKFLOW / NUEVA CUENTA</p>
    <h1>Crear acceso</h1>
    <p className="auth-description">Registra tus credenciales y datos de contacto.</p>
    {error && <p className="auth-alert" role="alert">{error}</p>}
    <form className="auth-form register-form" onSubmit={submit}>
      <label>Email *<input autoComplete="email" type="email" required value={fields.email} onChange={(event) => updateField("email", event.target.value)} aria-invalid={Boolean(fieldErrors.email)} />{fieldErrors.email && <small>{fieldErrors.email}</small>}</label>
      <label>Contraseña *<input autoComplete="new-password" type="password" required minLength={8} value={fields.password} onChange={(event) => updateField("password", event.target.value)} aria-invalid={Boolean(fieldErrors.password)} />{fieldErrors.password && <small>{fieldErrors.password}</small>}</label>
      <label>Repetir contraseña *<input autoComplete="new-password" type="password" required minLength={8} value={fields.confirm} onChange={(event) => updateField("confirm", event.target.value)} aria-invalid={Boolean(fieldErrors.confirm)} />{fieldErrors.confirm && <small>{fieldErrors.confirm}</small>}</label>
      <label>Nombre<input autoComplete="name" value={fields.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(fieldErrors.name)} />{fieldErrors.name && <small>{fieldErrors.name}</small>}</label>
      <label>Teléfono<input autoComplete="tel" type="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} />{fieldErrors.phone && <small>{fieldErrors.phone}</small>}</label>
      <label>Dirección<input autoComplete="street-address" value={fields.address} onChange={(event) => updateField("address", event.target.value)} aria-invalid={Boolean(fieldErrors.address)} />{fieldErrors.address && <small>{fieldErrors.address}</small>}</label>
      <button className="auth-submit register-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando cuenta…" : "Crear cuenta"}</button>
    </form>
    <p className="auth-switch">¿Ya tienes acceso? <Link href="/login">Iniciar sesión</Link></p>
  </section>;
}
