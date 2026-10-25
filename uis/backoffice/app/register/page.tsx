"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "../../lib/auth-client";
import { ApiError, parseResponse, toUserMessage } from "../../lib/http";

type FieldErrors = Partial<Record<"email" | "password" | "confirm" | "name" | "phone" | "address", string>>;

function pickFieldErrors(errors: Record<string, string>): FieldErrors {
  const picked: FieldErrors = {};
  for (const field of ["email", "password", "name", "phone", "address"] as const) {
    if (errors[field]) picked[field] = errors[field];
  }
  return picked;
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
      try {
        await parseResponse<unknown>(registration, "No se pudo crear la cuenta.");
      } catch (registrationError) {
        if (registrationError instanceof ApiError) setFieldErrors(pickFieldErrors(registrationError.fieldErrors));
        throw registrationError;
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      let loginBody: { access_token?: string };
      try {
        loginBody = await parseResponse<{ access_token?: string }>(login, "La cuenta se creó, pero no se pudo iniciar sesión.");
      } catch {
        // The account exists: send the user to the login screen instead of leaving them stuck here.
        throw new ApiError("Tu cuenta se ha creado, pero no hemos podido iniciar la sesión. Entra desde «Iniciar sesión».", login.status);
      }
      if (!loginBody?.access_token) throw new ApiError("Tu cuenta se ha creado. Entra desde «Iniciar sesión».", 502);
      localStorage.setItem(TOKEN_KEY, loginBody.access_token);
      router.replace("/");
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo crear la cuenta. Inténtalo de nuevo."));
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
