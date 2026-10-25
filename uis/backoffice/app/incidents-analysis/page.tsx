"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import "./analysis.css";
import { ErrorState } from "../../components/ErrorState";
import { ApiError, parseResponse, toUserMessage } from "../../lib/http";

type IncidentAnalysis = {
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

function formatCount(value: number | null | undefined) {
  return (typeof value === "number" && Number.isFinite(value) ? value : 0).toLocaleString("es-MX");
}

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

export default function IncidentsAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IncidentAnalysis | null>(null);
  const [error, setError] = useState("");
  const [failedAction, setFailedAction] = useState<"analyze" | "export" | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
  }

  async function analyze(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!file) {
      setError("Selecciona un archivo CSV para continuar.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setFailedAction(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/incidents/analyze", {
        method: "POST",
        body: formData,
      });
      const body = await parseResponse<IncidentAnalysis>(response, "No se pudo analizar el archivo.");
      if (!body?.metrics) throw new ApiError("El servidor ha devuelto un análisis incompleto. Inténtalo de nuevo.", 502);
      setResult(body);
    } catch (requestError) {
      setFailedAction("analyze");
      setError(toUserMessage(requestError, "No se pudo analizar el archivo. Comprueba que es un CSV válido e inténtalo de nuevo."));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function exportResults() {
    setIsExporting(true);
    setError("");
    setFailedAction(null);
    try {
      const response = await fetch("/api/incidents/results/export");
      if (!response.ok) {
        // Reuse the shared mapping so a 404 or 500 gets a readable explanation.
        await parseResponse<unknown>(response, "No se pudieron descargar los resultados.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "results.csv";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setFailedAction("export");
      setError(toUserMessage(requestError, "No se pudieron descargar los resultados. Inténtalo de nuevo."));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <header className="topbar analysis-header">
        <div>
          <p className="kicker">OPERACIONES / CALIDAD</p>
          <h1>Analisis de incidencias</h1>
        </div>
      </header>

      <section className="analysis-intro">
        <div>
          <h2>Validacion y satisfaccion</h2>
          <p>Revisa volumen, calidad de registros y puntajes de incidentes cerrados.</p>
        </div>
      </section>

      <form className="analysis-upload" onSubmit={analyze}>
        <label className="upload-picker" htmlFor="incidents-csv">
          <span className="upload-icon" aria-hidden="true">↑</span>
          <span className="upload-copy">
            <strong>{file ? file.name : "Selecciona un archivo CSV"}</strong>
            <small>{file ? `${formatCount(file.size)} bytes` : "incident_id, date, country, customer_type, tracking_number, carrier, category, description, status, customer_email, satisfaction_score"}</small>
          </span>
          <span className="secondary-button">Examinar</span>
        </label>
        <input id="incidents-csv" type="file" accept=".csv,text/csv" onChange={selectFile} />
        <div className="upload-actions">
          <span>Los correos se validan, pero no aparecen en el informe ni en la exportacion.</span>
          <button className="primary-button" type="submit" disabled={isAnalyzing || !file}>
            {isAnalyzing ? "Analizando..." : "Analizar archivo"}
          </button>
        </div>
      </form>

      {isAnalyzing && <p className="analysis-loading" aria-live="polite">Analizando el archivo…</p>}
      {error && <ErrorState
        title={failedAction === "export" ? "No se pudo descargar el CSV" : "No se pudo completar el análisis"}
        message={error}
        onRetry={failedAction === "export" ? exportResults : failedAction === "analyze" ? () => analyze() : undefined}
      />}

      {result && (
        <section className="analysis-results" aria-live="polite">
          <div className="results-heading">
            <div>
              <p className="kicker">RESULTADOS</p>
              <h2>Resumen del archivo</h2>
            </div>
            <button className="secondary-button" type="button" onClick={exportResults} disabled={isExporting}>
              {isExporting ? "Preparando..." : "Descargar CSV"}
            </button>
          </div>

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
        </section>
      )}
    </>
  );
}