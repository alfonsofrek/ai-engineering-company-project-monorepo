export function LoadingState({ label = "Cargando información..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      <span>{label}</span>
    </div>
  );
}
