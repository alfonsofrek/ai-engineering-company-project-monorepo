"use client";

import { useApiQuery } from "../hooks/useApiQuery";
import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  type IncidentSummary,
  labelFor,
  ORIGIN_LABELS,
  STATUS_LABELS,
} from "../lib/incidents";
import { ErrorState } from "./ErrorState";

function Group({ title, counts, labels, total }: {
  title: string;
  counts: Record<string, number> | undefined;
  labels: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(counts ?? {});
  return (
    <section className="summary-group">
      <h2>{title}</h2>
      {entries.length === 0 ? <p className="summary-empty">Sin datos.</p> : (
        <ul>
          {entries.map(([key, value]) => (
            <li key={key}>
              <span>{labelFor(labels, key)}</span>
              <strong>{value ?? 0}</strong>
              <i style={{ width: `${total ? Math.round(((value ?? 0) / total) * 100) : 0}%` }} aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Aggregated metrics from GET /api/incidents/summary. It loads independently:
 * a slow or failed summary never blocks or breaks the incident list next to it.
 */
export function IncidentSummaryPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const { state, retry } = useApiQuery<IncidentSummary>("/api/incidents/summary", "No se pudieron cargar las métricas.", refreshKey);

  if (state.status === "loading") {
    return <section className="summary-panel summary-loading" aria-live="polite"><span className="incident-spinner" aria-hidden="true" /> Cargando métricas…</section>;
  }
  if (state.status === "error") {
    return (
      <section className="summary-panel">
        <ErrorState compact title="Métricas no disponibles" message={state.message} onRetry={retry} />
      </section>
    );
  }

  const summary = state.data;
  const total = summary?.total ?? 0;
  return (
    <section className="summary-panel" aria-label="Resumen de incidencias">
      <div className="summary-total"><span>Total de incidencias</span><strong>{total}</strong></div>
      <Group title="Por estado" counts={summary?.by_status} labels={STATUS_LABELS} total={total} />
      <Group title="Por categoría" counts={summary?.by_category} labels={CATEGORY_LABELS} total={total} />
      <Group title="Por origen" counts={summary?.by_origin} labels={ORIGIN_LABELS} total={total} />
      <Group title="Por sucursal" counts={summary?.by_branch} labels={BRANCH_LABELS} total={total} />
    </section>
  );
}
