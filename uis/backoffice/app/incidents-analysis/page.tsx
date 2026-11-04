"use client";

import dynamic from "next/dynamic";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { formatCount, type IncidentAnalysis } from "../../lib/incident-analysis";
import "./analysis.css";
import { ErrorState } from "../../components/ErrorState";
import { ApiError, parseResponse, toUserMessage } from "../../lib/http";

const AnalysisResults = dynamic(() => import("../../components/AnalysisResults"), {
  loading: () => <p className="analysis-loading" aria-live="polite">Preparando resultados…</p>,
});

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

          <AnalysisResults result={result} />
        </section>
      )}
    </>
  );
}