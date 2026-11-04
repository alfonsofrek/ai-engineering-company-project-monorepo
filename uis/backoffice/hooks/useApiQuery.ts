"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/auth-client";
import { parseResponse, toUserMessage } from "../lib/http";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

type Settled<T> = { key: string; state: Exclude<QueryState<T>, { status: "loading" }> };

/**
 * GET an API resource with the three UI states (loading / success / error) and a retry.
 *
 * Replaces the pattern that was repeated in the incident list and the summary panel:
 * an effect with an `active` flag to ignore stale responses, parseResponse +
 * toUserMessage, and a counter for the retry button.
 *
 * - Changing `path` (e.g. new filters) or calling `retry()` shows "loading".
 * - Changing `refreshKey` refetches in the background and keeps the current data visible.
 */
export function useApiQuery<T>(path: string, fallbackMessage: string, refreshKey: number = 0) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const identity = `${path}#${attempt}`;

  useEffect(() => {
    let active = true;
    apiFetch(path)
      .then((response) => parseResponse<T>(response, fallbackMessage))
      .then((data) => {
        if (active) setSettled({ key: identity, state: { status: "success", data } });
      })
      .catch((error: unknown) => {
        if (active) setSettled({ key: identity, state: { status: "error", message: toUserMessage(error, fallbackMessage) } });
      });
    return () => { active = false; };
  }, [path, fallbackMessage, identity, refreshKey]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const state: QueryState<T> = settled?.key === identity ? settled.state : { status: "loading" };

  return { state, retry };
}
