"use client";

import { useState } from "react";
import { CandidateStage, CandidateStatus, STAGE_OPTIONS, STATUS_OPTIONS } from "@/types";
import { ApiError, patchCandidate } from "@/lib/services/candidates";

interface StatusStageControlsProps {
  candidateId: string;
  status: CandidateStatus;
  stage: CandidateStage;
  onUpdated: (status: CandidateStatus, stage: CandidateStage) => void;
}

export function StatusStageControls({
  candidateId,
  status,
  stage,
  onUpdated,
}: StatusStageControlsProps) {
  const [saving, setSaving] = useState<"status" | "stage" | null>(null);
  const [error, setError] = useState("");

  async function handleChange(field: "status" | "stage", value: string) {
    setSaving(field);
    setError("");
    try {
      const updated = await patchCandidate(candidateId, { [field]: value });
      onUpdated(updated.status, updated.stage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el candidato.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="status-select" className="text-xs font-medium text-slate-600">
          Estado
        </label>
        <select
          id="status-select"
          value={status}
          disabled={saving === "status"}
          onChange={(e) => handleChange("status", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="stage-select" className="text-xs font-medium text-slate-600">
          Etapa
        </label>
        <select
          id="stage-select"
          value={stage}
          disabled={saving === "stage"}
          onChange={(e) => handleChange("stage", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
