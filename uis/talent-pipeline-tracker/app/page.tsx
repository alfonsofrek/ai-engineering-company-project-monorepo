"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateFilters } from "@/components/CandidateFilters";
import { CandidateTable } from "@/components/CandidateTable";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { ApiError, getCandidates } from "@/lib/services/candidates";
import { Candidate } from "@/types";

function CandidateListContent() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      setStatus("loading");
      try {
        const response = await getCandidates({
          status: searchParams.get("status") ?? undefined,
          stage: searchParams.get("stage") ?? undefined,
          search: searchParams.get("search") ?? undefined,
        });
        if (!cancelled) {
          setCandidates(response.data);
          setStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Ocurrió un error inesperado al cargar los candidatos."
          );
          setStatus("error");
        }
      }
    }

    loadCandidates();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Candidatos</h1>
        <p className="text-sm text-slate-500">
          Pipeline de reclutamiento de TrackFlow: visualiza, filtra y da seguimiento a cada postulación.
        </p>
      </div>
      <CandidateFilters />
      {status === "loading" && <LoadingState label="Cargando candidatos..." />}
      {status === "error" && <ErrorState message={errorMessage} />}
      {status === "success" && <CandidateTable candidates={candidates} />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingState label="Cargando candidatos..." />}>
      <CandidateListContent />
    </Suspense>
  );
}
