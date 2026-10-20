"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CandidateForm } from "@/components/CandidateForm";
import { createCandidate } from "@/lib/services/candidates";
import { CandidateInput } from "@/types";

export default function NewCandidatePage() {
  const router = useRouter();

  async function handleSubmit(input: CandidateInput) {
    const candidate = await createCandidate(input);
    router.push(`/candidates/${candidate.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← Volver al listado
        </Link>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Registrar candidato</h1>
        <p className="mb-6 text-sm text-slate-500">
          Agrega una nueva postulación al pipeline de People &amp; Talent de TrackFlow.
        </p>
        <CandidateForm submitLabel="Registrar candidato" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
