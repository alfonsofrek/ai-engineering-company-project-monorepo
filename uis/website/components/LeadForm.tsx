"use client";

import { type FocusEvent, type FormEvent, useRef, useState } from "react";
import { useFormFields } from "../hooks/useFormFields";
import { track } from "../lib/telemetry";

const initialForm = { fullName: "", companyName: "", email: "", country: "Mexico", phone: "", monthlyVolume: "" };
type LeadField = keyof typeof initialForm;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = { Mexico: /^\+52[0-9 ]{8,}$/, Espana: /^\+34[0-9 ]{8,}$/ } as const;

/** Validation rules from CONTEXT.md §5. Returns the names of the invalid fields. */
function invalidFields(values: typeof initialForm): LeadField[] {
  const invalid: LeadField[] = [];
  if (values.fullName.trim().length < 3) invalid.push("fullName");
  if (!values.companyName.trim()) invalid.push("companyName");
  if (!EMAIL.test(values.email.trim())) invalid.push("email");
  const country = values.country as keyof typeof PHONE;
  if (!(country in PHONE)) invalid.push("country");
  if (!(country in PHONE) || !PHONE[country].test(values.phone.trim())) invalid.push("phone");
  const volume = Number(values.monthlyVolume);
  if (!Number.isInteger(volume) || volume <= 0) invalid.push("monthlyVolume");
  return invalid;
}

/** CONTEXT.md §6. */
function segment(volume: number) {
  return volume >= 5000 ? "enterprise" : volume >= 500 ? "mid_market" : "small";
}

const LABELS: Record<LeadField, string> = {
  fullName: "Nombre completo (mínimo 3 caracteres)",
  companyName: "Empresa",
  email: "Email corporativo",
  country: "País",
  phone: "Teléfono con prefijo +52 o +34 según el país",
  monthlyVolume: "Envíos mensuales (número entero mayor que 0)",
};

/** The only interactive part of the home page: kept as a small client island. */
export function LeadForm() {
  const { values, field } = useFormFields(initialForm);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<LeadField[]>([]);
  const started = useRef(false);
  const attempts = useRef(0);

  function firstFocus(event: FocusEvent<HTMLFormElement>) {
    if (started.current) return;
    const name = (event.target as unknown as { name?: string }).name as LeadField | undefined;
    if (!name || !(name in initialForm)) return;
    started.current = true;
    track("lead_form_started", { first_field: name });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    attempts.current += 1;
    const invalid = invalidFields(values);
    const volume = Number(values.monthlyVolume);
    const validVolume = Number.isInteger(volume) && volume > 0;
    // MM-1, MM-2, MM-4. Never the values of name, company, email or phone: only which fields failed.
    track("lead_form_submitted", {
      is_valid: invalid.length === 0,
      invalid_fields: invalid,
      country: values.country === "Mexico" || values.country === "Espana" ? values.country : null,
      monthly_volume: validVolume ? volume : null,
      segment: validVolume ? segment(volume) : null,
      attempt_number: attempts.current,
    });
    setErrors(invalid);
    setSent(invalid.length === 0);
  }

  const invalidProps = (name: LeadField) => ({ "aria-invalid": errors.includes(name) || undefined });

  return (
    <form className="lead-form" onSubmit={submit} onFocus={firstFocus} noValidate>
      <div className="form-heading"><span>01 — DATOS DE CONTACTO</span><small>* campos obligatorios</small></div>
      <label>Nombre completo *<input required minLength={3} autoComplete="name" {...field("fullName")} {...invalidProps("fullName")} placeholder="Tu nombre" /></label>
      <label>Empresa *<input required autoComplete="organization" {...field("companyName")} {...invalidProps("companyName")} placeholder="Nombre de tu empresa" /></label>
      <div className="form-grid">
        <label>Email corporativo *<input required type="email" autoComplete="email" {...field("email")} {...invalidProps("email")} placeholder="nombre@empresa.com" /></label>
        <label>Pais de operacion *<select {...field("country")}><option>Mexico</option><option>Espana</option></select></label>
      </div>
      <div className="form-grid">
        <label>Telefono (+52 / +34) *<input required type="tel" autoComplete="tel" {...field("phone")} {...invalidProps("phone")} placeholder="+52 55 0000 0000" /></label>
        <label>Envios mensuales estimados *<input required type="number" min="1" step="1" inputMode="numeric" {...field("monthlyVolume")} {...invalidProps("monthlyVolume")} placeholder="Ej. 2500" /></label>
      </div>
      {errors.length > 0 && (
        <p className="form-error" role="alert">Revisa estos campos: {errors.map((name) => LABELS[name]).join(" · ")}.</p>
      )}
      <button className="button button-dark" type="submit">Enviar solicitud <span aria-hidden="true">↗</span></button>
      {sent && <p className="success" role="status">Solicitud recibida. El equipo de TrackFlow revisara tus datos.</p>}
    </form>
  );
}
