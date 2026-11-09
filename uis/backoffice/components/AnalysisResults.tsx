"use client";

/**
 * Results of a CSV analysis: metric cards and the five breakdowns.
 * Lazy-loaded from /incidents-analysis with next/dynamic: it is only needed after a file
 * has been analysed, which most visits to the page never do.
 */

import { formatCount, type IncidentAnalysis } from "../lib/incident-analysis";

function Breakdown({ title, counts, total }: { title: string; counts?: Record<string, number> | null; total?: number | null }) {
  const entries = Object.entries(counts ?? {});
  return (
    <section>
      <h3>{title}</h3>
      {entries.length === 0 && <p>Sin datos para este desglose.</p>}
      <ul>{entries.map(([name, count]) => (
        <li key={name}>
          <span>{name.replaceAll("_", " ")}</span>
          <strong>{formatCount(count)} <small>{total ? `(${(count / total * 100).toFixed(1)}%)` : "(0.0%)"}</small></strong>
        </li>
      ))}</ul>
    </section>
  );
}

export default function AnalysisResults({ result }: { result: IncidentAnalysis }) {
  return <>
          <div className="analysis-metrics">
            <article><span>Registros procesados</span><strong>{formatCount(result.metrics?.total)}</strong></article>
            <article><span>Registros validos</span><strong>{formatCount(result.metrics?.valid)}</strong></article>
            <article><span>Registros invalidos</span><strong>{formatCount(result.metrics?.invalid)}</strong></article>
            <article><span>Puntajes en cerrados</span><strong>{formatCount(result.metrics?.scoredClosed)} / {formatCount(result.metrics?.closed)}</strong></article>
            <article><span>Satisfaccion media</span><strong>{result.metrics?.averageSatisfaction?.toFixed(2) ?? "N/A"} / 5</strong></article>
          </div>

          <div className="analysis-breakdowns">
            <section>
              <h3>Registros invalidos por motivo</h3>
              <p>Un registro puede activar mas de una regla de validacion.</p>
              <ul>{Object.entries(result.errors ?? {}).filter(([, issue]) => (issue?.count ?? 0) > 0).map(([key, issue]) => (
                <li key={key}><span>{issue?.label ?? key}</span><strong>{formatCount(issue?.count)}</strong></li>
              ))}</ul>
              {(result.metrics?.invalid ?? 0) === 0 && <p>No hay registros invalidos.</p>}
            </section>
            <Breakdown title="Incidencias por categoria" counts={result.categories} total={result.metrics?.valid} />
            <Breakdown title="Incidencias por estado" counts={result.statuses} total={result.metrics?.valid} />
            <Breakdown title="Incidencias por pais" counts={result.countries} total={result.metrics?.valid} />
            <Breakdown title="Puntajes de satisfaccion (cerrados)" counts={result.satisfactionScores} total={result.metrics?.scoredClosed} />
          </div>
  </>;
}
