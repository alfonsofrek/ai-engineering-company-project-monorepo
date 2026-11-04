/** Shared by /incidents-analysis and its lazy-loaded results component. */

export type IncidentAnalysis = {
  metrics: {
    total: number;
    valid: number;
    invalid: number;
    scoredClosed: number;
    closed: number;
    averageSatisfaction: number | null;
  };
  errors: Record<string, { label: string; count: number }>;
  categories: Record<string, number>;
  statuses: Record<string, number>;
  countries: Record<string, number>;
  satisfactionScores: Record<string, number>;
};

export function formatCount(value: number | null | undefined) {
  return (typeof value === "number" && Number.isFinite(value) ? value : 0).toLocaleString("es-MX");
}

