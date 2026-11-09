import { routeTemplate, telemetry, track } from "./telemetry";

export const TOKEN_KEY = "trackflow_access_token";

export type Profile = {
  id: number;
  user_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
};

export type AuthMe = {
  email: string;
  role: "admin" | "manager" | "user";
  profile: Profile;
};

const TRACKED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/**
 * fetch for the TrackFlow API: adds the bearer token and an X-Request-ID (correlation with
 * API logs and telemetry), records api_request_completed, and on 401 with a token clears the
 * session and emits session_expired.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  headers.set("X-Request-ID", requestId);
  telemetry.noteRequest(requestId);

  const method = (init.method ?? "GET").toUpperCase();
  const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  const route = routeTemplate(url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api(?=\/)/, ""));
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();

  const response = await fetch(input, { ...init, headers });

  if (TRACKED_METHODS.has(method)) {
    const length = Number(response.headers.get("Content-Length"));
    track("api_request_completed", {
      route,
      method,
      http_status: response.status,
      duration_ms: Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - started) * 10) / 10,
      response_bytes: Number.isFinite(length) && length > 0 ? length : null,
      sampled: false, // every request is recorded; true would mean this event stands for a sample
    });
  }

  if (response.status === 401 && token && typeof window !== "undefined") {
    track("session_expired", { route: routeTemplate(window.location.pathname), minutes_since_login: telemetry.minutesSinceLogin() });
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("trackflow:unauthorized"));
  }
  return response;
}
