"use client";

import { useState } from "react";
import { CandidateInput } from "@/types";

interface CandidateFormProps {
  initialValues?: Partial<CandidateInput>;
  submitLabel: string;
  onSubmit: (input: CandidateInput) => Promise<void>;
}

interface FormErrors {
  [key: string]: string;
}

const EMPTY_FORM: CandidateInput = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: 0,
};

export function CandidateForm({ initialValues, submitLabel, onSubmit }: CandidateFormProps) {
  const [form, setForm] = useState<CandidateInput>({ ...EMPTY_FORM, ...initialValues });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "El nombre completo es obligatorio.";
    if (!form.email.trim()) nextErrors.email = "El email es obligatorio.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "El email no es válido.";
    if (!form.phone.trim()) nextErrors.phone = "El teléfono es obligatorio.";
    if (!form.position.trim()) nextErrors.position = "La posición es obligatoria.";
    if (form.experience_years === undefined || form.experience_years === null || form.experience_years < 0) {
      nextErrors.experience_years = "Los años de experiencia deben ser un número mayor o igual a 0.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        linkedin_url: form.linkedin_url || null,
        cv_url: form.cv_url || null,
      });
      setFeedback({ type: "success", message: "Candidato guardado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar el candidato.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof CandidateInput>(field: K, value: CandidateInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="full_name" className="text-xs font-medium text-slate-600">
            Nombre completo *
          </label>
          <input
            id="full_name"
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-slate-600">
            Email *
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-xs font-medium text-slate-600">
            Teléfono *
          </label>
          <input
            id="phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="position" className="text-xs font-medium text-slate-600">
            Posición *
          </label>
          <input
            id="position"
            value={form.position}
            onChange={(e) => updateField("position", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {errors.position && <p className="text-xs text-red-600">{errors.position}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="linkedin_url" className="text-xs font-medium text-slate-600">
            LinkedIn
          </label>
          <input
            id="linkedin_url"
            value={form.linkedin_url ?? ""}
            onChange={(e) => updateField("linkedin_url", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cv_url" className="text-xs font-medium text-slate-600">
            Enlace del CV
          </label>
          <input
            id="cv_url"
            value={form.cv_url ?? ""}
            onChange={(e) => updateField("cv_url", e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="experience_years" className="text-xs font-medium text-slate-600">
            Años de experiencia *
          </label>
          <input
            id="experience_years"
            type="number"
            min={0}
            value={form.experience_years}
            onChange={(e) => updateField("experience_years", Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {errors.experience_years && <p className="text-xs text-red-600">{errors.experience_years}</p>}
        </div>
      </div>

      {feedback && (
        <p className={`text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
