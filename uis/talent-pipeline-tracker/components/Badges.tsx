import { CandidateStage, CandidateStatus, stageLabel, statusLabel } from "@/types";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  received: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  selected: "bg-emerald-100 text-emerald-800",
  discarded: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as CandidateStatus] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {statusLabel(status)}
    </span>
  );
}

export function StageBadge({ stage }: { stage: CandidateStage | string }) {
  return (
    <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
      {stageLabel(stage)}
    </span>
  );
}
