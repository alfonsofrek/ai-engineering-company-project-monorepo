/** Incident domain values — must match company-BRIEFING.md and services/api/incident_models.py. */

export type IncidentCategory = "lost_parcel" | "delayed_delivery" | "wrong_address" | "return_request" | "damage";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";
export type IncidentBranch = "los_angeles" | "zaragoza" | "central";

export type Incident = {
  id: number;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
  source_ref?: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  lost_parcel: "Paquete perdido",
  delayed_delivery: "Entrega retrasada",
  wrong_address: "Dirección incorrecta",
  return_request: "Solicitud de devolución",
  damage: "Paquete dañado",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente",
  branch: "Sucursal",
  internal: "Interno",
};

export const BRANCH_LABELS: Record<IncidentBranch, string> = {
  los_angeles: "Hub Los Ángeles",
  zaragoza: "Almacén Zaragoza",
  central: "Central (sede)",
};

/** Lifecycle from the BRIEFING: resolved and discarded are final. */
export const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

export function labelFor<T extends string>(labels: Record<T, string>, value: string | null | undefined) {
  return value && value in labels ? labels[value as T] : value ?? "—";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
