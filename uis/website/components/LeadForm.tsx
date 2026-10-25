"use client";

import { type FormEvent, useState } from "react";
import { useFormFields } from "../hooks/useFormFields";

const initialForm = { fullName: "", companyName: "", email: "", country: "Mexico", phone: "", monthlyVolume: "" };

/** The only interactive part of the home page: kept as a small client island. */
export function LeadForm() {
  const { field } = useFormFields(initialForm);
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="form-heading"><span>01 — DATOS DE CONTACTO</span><small>* campos obligatorios</small></div>
      <label>Nombre completo *<input required minLength={3} autoComplete="name" {...field("fullName")} placeholder="Tu nombre" /></label>
      <label>Empresa *<input required autoComplete="organization" {...field("companyName")} placeholder="Nombre de tu empresa" /></label>
      <div className="form-grid">
        <label>Email corporativo *<input required type="email" autoComplete="email" {...field("email")} placeholder="nombre@empresa.com" /></label>
        <label>Pais de operacion *<select {...field("country")}><option>Mexico</option><option>Espana</option></select></label>
      </div>
      <div className="form-grid">
        <label>Telefono (+52 / +34) *<input required type="tel" autoComplete="tel" pattern="\+(52|34)[0-9 ]{8,}" {...field("phone")} placeholder="+52 55 0000 0000" /></label>
        <label>Envios mensuales estimados *<input required type="number" min="1" step="1" inputMode="numeric" {...field("monthlyVolume")} placeholder="Ej. 2500" /></label>
      </div>
      <button className="button button-dark" type="submit">Enviar solicitud <span aria-hidden="true">↗</span></button>
      {sent && <p className="success" role="status">Solicitud recibida. El equipo de TrackFlow revisara tus datos.</p>}
    </form>
  );
}
