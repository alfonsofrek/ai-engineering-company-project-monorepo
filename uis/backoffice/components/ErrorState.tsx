"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { classifyError, lastDisplayedError, SUPPORT_EMAIL } from "../lib/http";
import { routeTemplate, track } from "../lib/telemetry";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  /** The original error, if the caller has it; otherwise the last one shown is used. */
  error?: unknown;
};

/** Error block with a way forward: retry, go home, or contact support. */
export function ErrorState({ title = "Algo no ha ido bien", message, onRetry, compact = false, error }: ErrorStateProps) {
  const pathname = usePathname();
  const retries = useRef(0);
  const info = useRef(error === undefined ? lastDisplayedError : classifyError(error));
  // A boolean, not the callback: callers pass inline arrows, which change on every render.
  const hasRetry = Boolean(onRetry);

  // One ui_error_displayed per error shown (a new message is a new error). The text is never sent.
  useEffect(() => {
    track("ui_error_displayed", {
      route: routeTemplate(pathname || "/"),
      error_kind: info.current.kind,
      http_status: info.current.status,
      has_retry: hasRetry,
    });
  }, [message, pathname, hasRetry]);

  function retry() {
    retries.current += 1;
    track("ui_error_retry_clicked", { route: routeTemplate(pathname || "/"), error_kind: info.current.kind, attempt: retries.current });
    onRetry?.();
  }

  return (
    <div className={`error-state${compact ? " error-state-compact" : ""}`} role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      <div className="error-state-actions">
        {onRetry && <button type="button" onClick={retry}>Reintentar</button>}
        {!compact && <Link href="/">Volver al inicio</Link>}
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contactar con soporte</a>
      </div>
    </div>
  );
}
