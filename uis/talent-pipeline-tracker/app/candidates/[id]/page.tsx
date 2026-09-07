"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Candidate, CandidateStage, CandidateStatus } from "@/types";
import { ApiError, getCandidateById } from "@/lib/services/candidates";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge, StageBadge } from "@/components/Badges";
import { StatusStageControls } from "@/components/StatusStageControls";
import { NotesSection } from "@/components/NotesSection";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCandidate() {
      setStatus("loading");
      try {
        const data = await getCandidateById(id);
        if (!cancelled) {
          setCandidate(data);
          setStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "No se pudo cargar la información del candidato."
          );
          setStatus("error");
        }
      }
    }
    loadCandidate();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleStatusStageUpdated(newStatus: CandidateStatus, newStage: CandidateStage) {
    setCandidate((prev) => (prev ? { ...prev, status: newStatus, stage: newStage } : prev));
  }

  if (status === "loading") return <LoadingState label="Cargando candidato..." />;
  if (status === "error") return <ErrorState message={errorMessage} />;
  if (!candidate) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← Volver al listado
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{candidate.full_name}</h1>
            <p className="text-sm text-slate-500">{candidate.position}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={candidate.status} />
            <StageBadge stage={candidate.stage} />
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Editar datos
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Email" value={candidate.email} />
          <InfoRow label="Teléfono" value={candidate.phone} />
          <InfoRow
            label="LinkedIn"
            value={
              candidate.linkedin_url ? (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 hover:underline"
                >
                  Ver perfil
                </a>
              ) : (
                "No registrado"
              )
            }
          />
          <InfoRow
            label="CV"
            value={
              candidate.cv_url ? (
                <a
                  href={candidate.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 hover:underline"
                >
                  Ver CV
                </a>
              ) : (
                "No registrado"
              )
            }
          />
          <InfoRow label="Años de experiencia" value={candidate.experience_years} />
          <InfoRow
            label="Fecha de postulación"
            value={new Date(candidate.applied_at).toLocaleDateString("es-ES")}
          />
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Estado del proceso</h2>
        <StatusStageControls
          candidateId={candidate.id}
          status={candidate.status}
          stage={candidate.stage}
          onUpdated={handleStatusStageUpdated}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <NotesSection candidateId={candidate.id} />
      </div>
    </div>
  );
}
