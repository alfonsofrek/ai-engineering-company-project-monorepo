/** Incident domain values — must match docs/briefings/centralized-incident-manager.es.md and services/api/incident_models.py. */

export type IncidentCategory =
  | "lost_parcel"
  | "delivery_failure"
  | "inventory_discrepancy"
  | "carrier_issue"
  | "returns_issue"
  | "warehouse_incident"
  | "system_failure"
  | "client_complaint"
  | "other";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";
export type IncidentBranch = "central" | "la_warehouse" | "la_office" | "zaragoza_warehouse" | "zaragoza_office";

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
  /** Only in the detail / create / status responses; the list endpoint omits it. */
  updated_at?: string;
};

export type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  lost_parcel: "Paquete extraviado",
  delivery_failure: "Fallo de entrega",
  inventory_discrepancy: "Discrepancia de inventario",
  carrier_issue: "Problema de carrier",
  returns_issue: "Problema de devolución",
  warehouse_incident: "Incidente en almacén",
  system_failure: "Fallo de sistema",
  client_complaint: "Queja de cliente",
  other: "Otra",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente",
  branch: "Almacén u oficina",
  internal: "Interno",
};

export const BRANCH_LABELS: Record<IncidentBranch, string> = {
  central: "Central",
  la_warehouse: "Los Ángeles — Almacén",
  la_office: "Los Ángeles — Oficina",
  zaragoza_warehouse: "Zaragoza — Almacén",
  zaragoza_office: "Zaragoza — Oficina",
};

/** Lifecycle from the briefing: resolved and discarded are final. */
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
