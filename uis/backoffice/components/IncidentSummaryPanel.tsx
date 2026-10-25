"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/auth-client";
import { parseResponse, toUserMessage } from "../lib/http";
import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  type IncidentSummary,
  labelFor,
  ORIGIN_LABELS,
  STATUS_LABELS,
} from "../lib/incidents";
import { ErrorState } from "./ErrorState";

type PanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; summary: IncidentSummary };

function Group({ title, counts, labels, total }: {
  title: string;
  counts: Record<string, number> | undefined;
  labels: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(counts ?? {});
  return (
    <section className="summary-group">
      <h3>{title}</h3>
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
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch("/api/incidents/summary")
      .then((response) => parseResponse<IncidentSummary>(response, "No se pudieron cargar las métricas."))
      .then((summary) => {
        if (active) setState({ kind: "ready", summary });
      })
      .catch((error: unknown) => {
        if (active) setState({ kind: "error", message: toUserMessage(error, "No se pudieron cargar las métricas.") });
      });
    return () => { active = false; };
  }, [refreshKey, retryKey]);

  if (state.kind === "loading") {
    return <section className="summary-panel summary-loading" aria-live="polite"><span className="incident-spinner" aria-hidden="true" /> Cargando métricas…</section>;
  }
  if (state.kind === "error") {
    return (
      <section className="summary-panel">
        <ErrorState compact title="Métricas no disponibles" message={state.message}
          onRetry={() => { setState({ kind: "loading" }); setRetryKey((key) => key + 1); }} />
      </section>
    );
  }

  const { summary } = state;
  const total = summary?.total ?? 0;
  return (
    <section className="summary-panel" aria-label="Resumen de incidencias">
      <div className="summary-total"><span>Total de incidencias</span><strong>{total}</strong></div>
      <Group title="Por estado" counts={summary.by_status} labels={STATUS_LABELS} total={total} />
      <Group title="Por categoría" counts={summary.by_category} labels={CATEGORY_LABELS} total={total} />
      <Group title="Por origen" counts={summary.by_origin} labels={ORIGIN_LABELS} total={total} />
      <Group title="Por sucursal" counts={summary.by_branch} labels={BRANCH_LABELS} total={total} />
    </section>
  );
}
