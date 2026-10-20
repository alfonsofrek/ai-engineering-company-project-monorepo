import Link from "next/link";
import { Candidate } from "@/types";
import { StatusBadge, StageBadge } from "@/components/Badges";

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  if (candidates.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No se encontraron candidatos con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Posición</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Etapa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {candidate.full_name}
                </Link>
                <div className="text-xs text-slate-500">{candidate.email}</div>
              </td>
              <td className="px-4 py-3 text-slate-700">{candidate.position}</td>
              <td className="px-4 py-3">
                <StatusBadge status={candidate.status} />
              </td>
              <td className="px-4 py-3">
                <StageBadge stage={candidate.stage} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
