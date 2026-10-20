"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CandidateForm } from "@/components/CandidateForm";
import { ApiError, getCandidateById, updateCandidate } from "@/lib/services/candidates";
import { Candidate, CandidateInput } from "@/types";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";

export default function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
          setErrorMessage(error instanceof ApiError ? error.message : "No se pudo cargar el candidato.");
          setStatus("error");
        }
      }
    }
    loadCandidate();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: CandidateInput) {
    await updateCandidate(id, input);
    router.push(`/candidates/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/candidates/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al detalle
        </Link>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Editar candidato</h1>
        <p className="mb-6 text-sm text-slate-500">Corrige los datos de la postulación.</p>

        {status === "loading" && <LoadingState label="Cargando candidato..." />}
        {status === "error" && <ErrorState message={errorMessage} />}
        {status === "success" && candidate && (
          <CandidateForm
            submitLabel="Guardar cambios"
            initialValues={{
              full_name: candidate.full_name,
              email: candidate.email,
              phone: candidate.phone,
              position: candidate.position,
              linkedin_url: candidate.linkedin_url ?? "",
              cv_url: candidate.cv_url ?? "",
              experience_years: candidate.experience_years,
            }}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
