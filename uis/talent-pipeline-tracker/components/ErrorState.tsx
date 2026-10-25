"use client";

import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/http";

type ErrorStateProps = {
  message: string;
  title?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
};

/** Error block with a way forward: retry, go back to the list, or contact support. */
export function ErrorState({ message, title, onRetry, showHomeLink = true }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {title && <strong className="font-semibold">{title}</strong>}
      <p>{message}</p>
      <div className="flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        )}
        {showHomeLink && <Link href="/" className="text-xs underline">Volver al listado</Link>}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs underline">Contactar con soporte</a>
      </div>
    </div>
  );
}
