/**
 * TelemetryService — the ONLY way the backoffice emits telemetry.
 *
 * Components call `track(eventType, properties)` and nothing else. This module:
 * - builds the envelope from docs/telemetry/telemetry-plan.md §5 (eventId, timestamp at
 *   capture, sessionId, userId, schemaVersion, requestId, source) — callers never pass them;
 * - keeps events in an in-memory queue and sends them in batches to
 *   NEXT_PUBLIC_TELEMETRY_ENDPOINT every 10 s or as soon as 20 are queued;
 * - flushes with navigator.sendBeacon when the tab is hidden or closed;
 * - retries a failed batch up to 3 times with exponential backoff, then drops it:
 *   telemetry must never block or break the app.
 *
 * Property keys must follow each event's allowlist in docs/telemetry/event-schemas.json.
 */

export const SCHEMA_VERSION = "1.0.0";
const APP = "backoffice" as const;

const ENDPOINT = process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || "/api/telemetry/events";
const RELEASE = (process.env.NEXT_PUBLIC_RELEASE || "dev").slice(0, 40);
const ENVIRONMENT = process.env.NODE_ENV === "production" ? "production" : "development";

export const FLUSH_INTERVAL_MS = 10_000;
export const MAX_BATCH_SIZE = 20;
export const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_QUEUE = 500; // safety cap if the endpoint is down for a long time
const SESSION_KEY = "trackflow_telemetry_session";
/** Set by /login on success; AuthProvider emits auth_login_succeeded once the role is known. */
export const LOGIN_PENDING_KEY = "trackflow_telemetry_login_pending";
const LOGIN_AT_KEY = "trackflow_telemetry_login_at";
const CORRELATION_WINDOW_MS = 2_000;

export type TelemetryEvent = {
  eventId: string;
  timestamp: string;
  sessionId: string;
  userId: string | null;
  event_type: string;
  schemaVersion: string;
  requestId: string;
  source: { app: typeof APP; release: string; environment: "development" | "production" };
  properties: Record<string, unknown>;
};

type Transport = {
  send: (endpoint: string, body: string) => Promise<boolean>;
  beacon: (endpoint: string, body: string) => boolean;
};

const browserTransport: Transport = {
  async send(endpoint, body) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  beacon(endpoint, body) {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
    // Cross-origin beacons can only carry CORS-safelisted types; the API parses the raw body.
    const type = endpoint.startsWith("/") ? "application/json" : "text/plain";
    return navigator.sendBeacon(endpoint, new Blob([body], { type }));
  },
};

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private userId: string | null = null;
  private memorySessionId: string | null = null;
  private lastRequest: { id: string; at: number } | null = null;
  private listening = false;

  constructor(private transport: Transport = browserTransport, private endpoint = ENDPOINT) {}

  /** Called once the session is known (AuthProvider). Never an email: the internal user id. */
  setUser(userId: string | number | null) {
    this.userId = userId === null ? null : String(userId);
  }

  /** A new sessionId starts at login (plan §5: "generated at login, stored in session memory"). */
  startSession() {
    const id = uuid();
    this.memorySessionId = id;
    storage()?.setItem(SESSION_KEY, id);
    storage()?.setItem(LOGIN_AT_KEY, String(Date.now()));
  }

  endSession() {
    storage()?.removeItem(SESSION_KEY);
    storage()?.removeItem(LOGIN_AT_KEY);
    this.memorySessionId = null;
    this.userId = null;
  }

  /** Minutes since the current session started, for session_expired. */
  minutesSinceLogin(): number | null {
    const at = Number(storage()?.getItem(LOGIN_AT_KEY));
    return at ? Math.floor((Date.now() - at) / 60_000) : null;
  }

  /** apiFetch registers the X-Request-ID it sent, so events caused by that call share it. */
  noteRequest(requestId: string) {
    this.lastRequest = { id: requestId, at: Date.now() };
  }

  track(eventType: string, properties: Record<string, unknown>) {
    if (typeof window === "undefined") return; // never during server rendering
    this.listen();
    const recent = this.lastRequest && Date.now() - this.lastRequest.at < CORRELATION_WINDOW_MS ? this.lastRequest.id : null;
    this.queue.push({
      eventId: uuid(),
      timestamp: new Date().toISOString(), // moment of capture, not of sending
      sessionId: this.sessionId(),
      userId: this.userId,
      event_type: eventType,
      schemaVersion: SCHEMA_VERSION,
      requestId: recent ?? uuid(),
      source: { app: APP, release: RELEASE, environment: ENVIRONMENT },
      properties,
    });
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);

    if (this.queue.length >= MAX_BATCH_SIZE) void this.flush();
    else if (!this.timer) this.timer = setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  /** Sends everything queued, in batches of at most MAX_BATCH_SIZE. */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, MAX_BATCH_SIZE);
      await this.sendWithRetry(batch);
    }
  }

  /** Pending events when the page is hidden/closed: in-flight fetches would be cancelled. */
  flushWithBeacon() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, MAX_BATCH_SIZE);
      const body = JSON.stringify({ events: batch });
      if (!this.transport.beacon(this.endpoint, body)) void this.sendWithRetry(batch);
    }
  }

  pendingCount() {
    return this.queue.length;
  }

  private async sendWithRetry(batch: TelemetryEvent[]) {
    const body = JSON.stringify({ events: batch });
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      if (await this.transport.send(this.endpoint, body)) return true;
      if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, BASE_BACKOFF_MS * 2 ** attempt));
    }
    return false; // dropped: 1 try + 3 retries (1 s, 2 s, 4 s) failed
  }

  private sessionId(): string {
    const stored = storage()?.getItem(SESSION_KEY);
    if (stored) return stored;
    if (!this.memorySessionId) {
      this.memorySessionId = uuid();
      storage()?.setItem(SESSION_KEY, this.memorySessionId);
    }
    return this.memorySessionId;
  }

  private listen() {
    if (this.listening || typeof document === "undefined") return;
    this.listening = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flushWithBeacon();
    });
    window.addEventListener("pagehide", () => this.flushWithBeacon());
  }
}

export const telemetry = new TelemetryService();

/** The single public tracking function. */
export function track(eventType: string, properties: Record<string, unknown>): void {
  telemetry.track(eventType, properties);
}

/** Exposed for unit tests with a fake transport. */
export function createTelemetryService(transport: Transport, endpoint = "/telemetry-test") {
  return new TelemetryService(transport, endpoint);
}

/** Route template for events: ids become [id] and the query string is dropped (plan §5.1.3). */
export function routeTemplate(path: string): string {
  const clean = path.split("?")[0].split("#")[0] || "/";
  return clean
    .split("/")
    .map((segment) => (/^\d+$/.test(segment) || /^[0-9a-f-]{20,}$/i.test(segment) ? "[id]" : segment))
    .join("/");
}

/** Short stable fingerprint for grouping uncaught errors without sending the message text. */
export function fingerprint(...parts: string[]): string {
  let hash = 0x811c9dc5;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export const telemetryRelease = RELEASE;
