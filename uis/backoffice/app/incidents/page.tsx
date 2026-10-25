"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "../../lib/auth-client";
import { parseResponse, toUserMessage } from "../../lib/http";
import { useApiQuery } from "../../hooks/useApiQuery";
import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  formatDate,
  type Incident,
  type IncidentStatus,
  labelFor,
  NEXT_STATUSES,
  ORIGIN_LABELS,
  STATUS_LABELS,
} from "../../lib/incidents";
import { ErrorState } from "../../components/ErrorState";
import { IncidentSummaryPanel } from "../../components/IncidentSummaryPanel";
import "./incidents.css";

type Filters = { status: string; origin: string; branch: string };
const NO_FILTERS: Filters = { status: "", origin: "", branch: "" };

export default function IncidentsPage() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [summaryKey, setSummaryKey] = useState(0);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [notice, setNotice] = useState("");
  // Local edits (optimistic status changes) layered over the fetched list.
  const [overrides, setOverrides] = useState<Record<number, Incident>>({});

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    const search = params.toString();
    return `/api/incidents${search ? `?${search}` : ""}`;
  }, [filters]);
  const { state, retry } = useApiQuery<Incident[]>(query, "No se pudieron cargar las incidencias.");
  const incidents = state.status === "success" && Array.isArray(state.data)
    ? state.data.map((item) => overrides[item.id] ?? item)
    : [];

  function changeFilter(key: keyof Filters, value: string) {
    setOverrides({});
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setOverrides({});
    setFilters(NO_FILTERS);
  }

  function replaceIncident(updated: Incident) {
    setOverrides((current) => ({ ...current, [updated.id]: updated }));
  }

  async function changeStatus(incident: Incident, nextStatus: IncidentStatus) {
    const previous = incident;
    setRowError(null);
    setNotice("");
    setSavingId(incident.id);
    // Optimistic update: the row changes immediately and is reverted if the API refuses it.
    replaceIncident({ ...incident, status: nextStatus });
    try {
      const response = await apiFetch(`/api/incidents/${incident.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const updated = await parseResponse<Incident>(response, "No se pudo actualizar el estado.");
      replaceIncident(updated);
      setNotice(`Incidencia #${incident.id}: ${STATUS_LABELS[nextStatus].toLowerCase()}.`);
      setSummaryKey((key) => key + 1);
    } catch (error) {
      replaceIncident(previous);
      setRowError({ id: incident.id, message: toUserMessage(error, "No se pudo actualizar el estado. Inténtalo de nuevo.") });
    } finally {
      setSavingId(null);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <header className="topbar incident-header">
        <div><p className="kicker">OPERACIONES / INCIDENCIAS</p><h1>Gestor de incidencias</h1></div>
        <Link className="primary-button incident-new" href="/incidents/new">+ Registrar incidencia</Link>
      </header>

      <IncidentSummaryPanel refreshKey={summaryKey} />

      <section className="incident-toolbar" aria-label="Filtros">
        <label>Estado
          <select value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Origen
          <select value={filters.origin} onChange={(event) => changeFilter("origin", event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Sucursal
          <select value={filters.branch} onChange={(event) => changeFilter("branch", event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(BRANCH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {hasFilters && <button type="button" className="incident-clear" onClick={clearFilters}>Quitar filtros</button>}
      </section>

      {notice && <p className="incident-success" role="status">{notice}</p>}

      {state.status === "loading" && <p className="incident-loading" aria-live="polite"><span className="incident-spinner" aria-hidden="true" /> Cargando incidencias…</p>}

      {state.status === "error" && <ErrorState title="No se pudieron cargar las incidencias" message={state.message} onRetry={retry} />}

      {state.status === "success" && incidents.length === 0 && (
        <div className="incident-empty">
          <strong>{hasFilters ? "Ninguna incidencia coincide con estos filtros." : "Todavía no hay incidencias registradas."}</strong>
          <p>{hasFilters ? "Prueba con otros filtros o quítalos para ver todas." : "Cuando alguien reporte una incidencia aparecerá aquí."}</p>
          {hasFilters
            ? <button type="button" onClick={clearFilters}>Quitar filtros</button>
            : <Link href="/incidents/new">Registrar la primera incidencia</Link>}
        </div>
      )}

      {state.status === "success" && incidents.length > 0 && (
        <div className="incident-table-wrap">
          <table>
            <thead><tr><th>#</th><th>INCIDENCIA</th><th>CATEGORÍA</th><th>ORIGEN</th><th>SUCURSAL</th><th>CREADA</th><th>ESTADO</th></tr></thead>
            <tbody>
              {incidents.map((incident) => {
                const nextStatuses = NEXT_STATUSES[incident.status] ?? [];
                return (
                  <tr key={incident.id}>
                    <td>{incident.id}</td>
                    <td>
                      <strong>{incident.title || "Sin título"}</strong>
                      <small className="incident-description" title={incident.description}>{incident.description}</small>
                      {incident.source_ref && <small className="incident-ref">Ref. {incident.source_ref}</small>}
                    </td>
                    <td>{labelFor(CATEGORY_LABELS, incident.category)}</td>
                    <td>{labelFor(ORIGIN_LABELS, incident.origin)}</td>
                    <td>{labelFor(BRANCH_LABELS, incident.branch)}</td>
                    <td><time dateTime={incident.created_at}>{formatDate(incident.created_at)}</time></td>
                    <td>
                      <span className={`incident-status ${incident.status}`}>{labelFor(STATUS_LABELS, incident.status)}</span>
                      {nextStatuses.length > 0 && (
                        <select
                          className="incident-status-select"
                          aria-label={`Cambiar estado de la incidencia ${incident.id}`}
                          value=""
                          disabled={savingId === incident.id}
                          onChange={(event) => event.target.value && changeStatus(incident, event.target.value as IncidentStatus)}
                        >
                          <option value="">{savingId === incident.id ? "Guardando…" : "Cambiar a…"}</option>
                          {nextStatuses.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
                        </select>
                      )}
                      {rowError?.id === incident.id && <small className="incident-row-error" role="alert">{rowError.message}</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
