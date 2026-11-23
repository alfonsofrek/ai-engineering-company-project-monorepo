"use client";

import { type FormEvent, useState } from "react";
import { COMMENTS_MAX, EMPTY_LEAD, LEAD_FIELDS, LOW_VOLUME_WARNING, type LeadField, type LeadValues, validateLead, validateLeadField } from "./leadValidation";

const COUNTRIES = [["united_states", "Estados Unidos"], ["spain", "España"], ["both", "Ambos"], ["other", "Otro"]];
const PRODUCTS = [["fashion", "Moda"], ["electronics", "Electrónica"], ["cosmetics", "Cosmética"], ["food", "Alimentación"], ["other", "Otro"]];
const VOLUMES = [["0-100", "0-100"], ["101-500", "101-500"], ["501-2000", "501-2000"], ["2000+", "2000+"], ["unsure", "No estoy seguro"]];
const SERVICES = [["warehousing", "Almacenaje"], ["last_mile", "Última milla"], ["reverse_logistics", "Logística inversa"]];
const THIRD_PARTY = [["yes", "Sí"], ["no", "No"], ["evaluating", "Estoy evaluando opciones"]];

/** Brand signup form: the only interactive part of the home page, kept as a small client island. */
export function LeadForm() {
  const [values, setValues] = useState<LeadValues>(EMPTY_LEAD);
  const [errors, setErrors] = useState<Partial<Record<LeadField, string>>>({});
  const [touched, setTouched] = useState<Set<LeadField>>(new Set());
  const [sent, setSent] = useState(false);

  function update<K extends LeadField>(field: K, value: LeadValues[K]) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched.has(field) || typeof value !== "string") {
      setErrors((current) => ({ ...current, [field]: validateLeadField(field, next) }));
      setTouched((current) => new Set(current).add(field));
    }
  }

  function blur(field: LeadField) {
    setTouched((current) => new Set(current).add(field));
    setErrors((current) => ({ ...current, [field]: validateLeadField(field, values) }));
  }

  function toggleService(service: string, checked: boolean) {
    update("services", checked ? [...values.services, service] : values.services.filter((item) => item !== service));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateLead(values);
    setErrors(found);
    setTouched(new Set(LEAD_FIELDS));
    const first = LEAD_FIELDS.find((field) => found[field]);
    if (first) {
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (values.monthlyVolume === "0-100" && !window.confirm(LOW_VOLUME_WARNING)) return;
    setSent(true); // Simulated submission: nothing is sent anywhere.
  }

  function clear() {
    setValues(EMPTY_LEAD);
    setErrors({});
    setTouched(new Set());
  }

  const describe = (field: LeadField) => (errors[field] ? `${field}-error` : undefined);
  const invalid = (field: LeadField) => (errors[field] ? true : undefined);
  const error = (field: LeadField) => errors[field] && <small id={`${field}-error`} className="field-error">{errors[field]}</small>;
  const left = COMMENTS_MAX - values.comments.length;

  if (sent) {
    return (
      <div className="lead-form success" role="status" tabIndex={-1}>
        <h3>¡Gracias por tu interés en TrackFlow!</h3>
        <p>Hemos recibido tu solicitud. Nuestro equipo comercial revisará tu información y te contactará en las próximas 24-48 horas para agendar una llamada y conocer tus necesidades logísticas en detalle.</p>
        <p>Si tienes alguna consulta urgente, escríbenos directamente a <a href="mailto:comercial@trackflow.com">comercial@trackflow.com</a></p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit} onReset={clear} noValidate>
      <div className="form-heading"><span>01 — DATOS DE LA EMPRESA</span><small>* campos obligatorios</small></div>
      <label>Nombre de la empresa *<input name="companyName" required minLength={2} autoComplete="organization" value={values.companyName} onChange={(event) => update("companyName", event.target.value)} onBlur={() => blur("companyName")} aria-invalid={invalid("companyName")} aria-describedby={describe("companyName")} />{error("companyName")}</label>
      <label>Persona de contacto *<input name="contactName" required autoComplete="name" value={values.contactName} onChange={(event) => update("contactName", event.target.value)} onBlur={() => blur("contactName")} aria-invalid={invalid("contactName")} aria-describedby={describe("contactName")} />{error("contactName")}</label>
      <div className="form-grid">
        <label>Email corporativo *<input name="email" required type="email" autoComplete="email" placeholder="nombre@empresa.com" value={values.email} onChange={(event) => update("email", event.target.value)} onBlur={() => blur("email")} aria-invalid={invalid("email")} aria-describedby={describe("email")} />{error("email")}</label>
        <label>Teléfono *<input name="phone" required type="tel" autoComplete="tel" placeholder="+1 213 555 0147" value={values.phone} onChange={(event) => update("phone", event.target.value)} onBlur={() => blur("phone")} aria-invalid={invalid("phone")} aria-describedby={describe("phone")} />{error("phone")}</label>
      </div>
      <label>Sitio web de la empresa<input name="website" type="url" autoComplete="url" placeholder="https://www.tuempresa.com" value={values.website} onChange={(event) => update("website", event.target.value)} onBlur={() => blur("website")} aria-invalid={invalid("website")} aria-describedby={describe("website")} />{error("website")}</label>

      <div className="form-heading"><span>02 — TU OPERACIÓN</span></div>
      <div className="form-grid">
        <label>País de operación principal *<select name="country" required value={values.country} onChange={(event) => update("country", event.target.value)} aria-invalid={invalid("country")} aria-describedby={describe("country")}><option value="">Selecciona…</option>{COUNTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error("country")}</label>
        <label>Tipo de producto *<select name="productType" required value={values.productType} onChange={(event) => update("productType", event.target.value)} aria-invalid={invalid("productType")} aria-describedby={describe("productType")}><option value="">Selecciona…</option>{PRODUCTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error("productType")}</label>
      </div>
      <label>Volumen mensual estimado de envíos *<select name="monthlyVolume" required value={values.monthlyVolume} onChange={(event) => update("monthlyVolume", event.target.value)} aria-invalid={invalid("monthlyVolume")} aria-describedby={describe("monthlyVolume")}><option value="">Selecciona…</option>{VOLUMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error("monthlyVolume")}</label>
      {values.monthlyVolume === "0-100" && values.productType && <p className="field-note" role="status">{LOW_VOLUME_WARNING}</p>}

      <fieldset aria-describedby={describe("services")}>
        <legend>Servicios de interés *</legend>
        {SERVICES.map(([value, label]) => <label key={value} className="choice"><input type="checkbox" name="services" value={value} checked={values.services.includes(value)} onChange={(event) => toggleService(value, event.target.checked)} /> {label}</label>)}
        {error("services")}
      </fieldset>
      <fieldset aria-describedby={describe("current3pl")}>
        <legend>¿Actualmente trabajas con otro 3PL? *</legend>
        {THIRD_PARTY.map(([value, label]) => <label key={value} className="choice"><input type="radio" name="current3pl" value={value} checked={values.current3pl === value} onChange={() => update("current3pl", value as LeadValues["current3pl"])} /> {label}</label>)}
        {error("current3pl")}
      </fieldset>
      <label>Comentarios o necesidades específicas<textarea name="comments" rows={4} value={values.comments} onChange={(event) => update("comments", event.target.value)} onBlur={() => blur("comments")} aria-invalid={invalid("comments")} aria-describedby={`comments-counter${errors.comments ? " comments-error" : ""}`} /><small id="comments-counter" aria-live="polite">{left >= 0 ? `${left} caracteres disponibles` : `${-left} caracteres de más`}</small>{error("comments")}</label>
      <label className="choice"><input type="checkbox" name="privacy" checked={values.privacy} onChange={(event) => update("privacy", event.target.checked)} aria-invalid={invalid("privacy")} aria-describedby={describe("privacy")} /> Acepto la política de privacidad *</label>
      {error("privacy")}

      <div className="hero-actions">
        <button className="button button-dark" type="submit">Enviar solicitud <span aria-hidden="true">↗</span></button>
        <button className="button" type="reset">Limpiar formulario</button>
      </div>
    </form>
  );
}
