"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { apiFetch } from "../../../lib/auth-client";
import { ApiError, parseResponse, toUserMessage } from "../../../lib/http";
import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  type Incident,
  type IncidentBranch,
  type IncidentCategory,
  type IncidentOrigin,
  type IncidentStatus,
  ORIGIN_LABELS,
  STATUS_LABELS,
} from "../../../lib/incidents";
import "../incidents.css";

type FormState = {
  title: string;
  description: string;
  category: IncidentCategory | "";
  status: IncidentStatus;
  origin: IncidentOrigin | "";
  branch: IncidentBranch | "";
};
type FieldName = keyof FormState;

const EMPTY_FORM: FormState = { title: "", description: "", category: "", status: "open", origin: "", branch: "" };
// A new incident can only start in a non-final state.
const INITIAL_STATUSES: IncidentStatus[] = ["open", "in_progress"];

function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (form.title.trim().length < 3) errors.title = "El título debe tener al menos 3 caracteres.";
  if (form.description.trim().length < 5) errors.description = "Describe la incidencia con al menos 5 caracteres.";
  if (!form.category) errors.category = "Selecciona una categoría.";
  if (!form.origin) errors.origin = "Indica el origen del reporte.";
  if (!form.branch) errors.branch = "Selecciona la sucursal (usa «Central» si no aplica a ninguna).";
  return errors;
}

export default function NewIncidentPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<Incident | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends FieldName>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setCreated(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setCreated(null);
    const clientErrors = validate(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() }),
      });
      const incident = await parseResponse<Incident>(response, "No se pudo registrar la incidencia.");
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setCreated(incident);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors as Partial<Record<FieldName, string>>);
      }
      setFormError(toUserMessage(error, "No se pudo registrar la incidencia. Inténtalo de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldError = (field: FieldName) =>
    fieldErrors[field] ? <small className="incident-field-error" id={`${field}-error`}>{fieldErrors[field]}</small> : null;

  return (
    <>
      <header className="topbar incident-header">
        <div><p className="kicker">INCIDENCIAS / ALTA</p><h1>Registrar incidencia</h1></div>
        <Link className="incident-link" href="/incidents">Ver todas las incidencias →</Link>
      </header>

      {created && (
        <p className="incident-success" role="status">
          Incidencia <strong>#{created.id}</strong> registrada como «{STATUS_LABELS[created.status]}».{" "}
          <Link href="/incidents">Ir al listado</Link>
        </p>
      )}
      {formError && <p className="incident-alert" role="alert">{formError}</p>}

      <form className="incident-form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
        <label className="incident-wide">Título *
          <input value={form.title} maxLength={120} onChange={(event) => update("title", event.target.value)}
            aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined}
            placeholder="Resumen breve del problema" />
          {fieldError("title")}
        </label>

        <label className="incident-wide">Descripción *
          <textarea rows={4} maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)}
            aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-error" : undefined}
            placeholder="Qué ha pasado, a quién afecta y cualquier dato útil (nº de seguimiento, cliente…)" />
          {fieldError("description")}
        </label>

        <label>Categoría *
          <select value={form.category} onChange={(event) => update("category", event.target.value as FormState["category"])} aria-invalid={Boolean(fieldErrors.category)}>
            <option value="">Selecciona…</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {fieldError("category")}
        </label>

        <label>Origen *
          <select value={form.origin} onChange={(event) => update("origin", event.target.value as FormState["origin"])} aria-invalid={Boolean(fieldErrors.origin)}>
            <option value="">Selecciona…</option>
            {Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {fieldError("origin")}
        </label>

        <label className={form.origin === "branch" ? "incident-branch-highlight" : undefined}>Sucursal *
          <select value={form.branch} onChange={(event) => update("branch", event.target.value as FormState["branch"])} aria-invalid={Boolean(fieldErrors.branch)}>
            <option value="">Selecciona…</option>
            {Object.entries(BRANCH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {form.origin === "branch" && <small className="incident-hint">Estás reportando desde una sucursal: indica cuál.</small>}
          {fieldError("branch")}
        </label>

        <label>Estado inicial
          <select value={form.status} onChange={(event) => update("status", event.target.value as IncidentStatus)} aria-invalid={Boolean(fieldErrors.status)}>
            {INITIAL_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
          </select>
          {fieldError("status")}
        </label>

        <div className="incident-actions">
          <span>Los campos con * son obligatorios.</span>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><span className="incident-spinner" aria-hidden="true" /> Registrando…</> : "Registrar incidencia"}
          </button>
        </div>
      </form>
    </>
  );
}
