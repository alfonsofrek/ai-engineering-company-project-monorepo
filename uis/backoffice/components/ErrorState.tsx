"use client";

import Link from "next/link";
import { SUPPORT_EMAIL } from "../lib/http";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
};

/** Error block with a way forward: retry, go home, or contact support. */
export function ErrorState({ title = "Algo no ha ido bien", message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div className={`error-state${compact ? " error-state-compact" : ""}`} role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      <div className="error-state-actions">
        {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
        {!compact && <Link href="/">Volver al inicio</Link>}
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contactar con soporte</a>
      </div>
    </div>
  );
}
