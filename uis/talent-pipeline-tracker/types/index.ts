export type CandidateStatus = "received" | "in_progress" | "selected" | "discarded";

export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export interface Note {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
  notes?: Note[];
}

export interface CandidateListResponse {
  total: number;
  page: number;
  limit: number;
  data: Candidate[];
}

export interface CandidateInput {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years: number;
}

export interface CandidatePatch {
  status?: CandidateStatus;
  stage?: CandidateStage;
}

export const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "received", label: "Recibido" },
  { value: "in_progress", label: "En proceso" },
  { value: "selected", label: "Seleccionado" },
  { value: "discarded", label: "Descartado" },
];

export const STAGE_OPTIONS: { value: CandidateStage; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "review", label: "En revisión" },
  { value: "personal_interview", label: "Entrevista personal" },
  { value: "technical_interview", label: "Entrevista técnica" },
  { value: "offer_presented", label: "Oferta presentada" },
];

export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function stageLabel(stage: string): string {
  return STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
}
