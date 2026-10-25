/**
 * Shared helpers to turn HTTP and network failures into messages a user can act on.
 *
 * Rules applied everywhere in the backoffice:
 * - A response body is parsed defensively: a proxy error page (HTML) must never
 *   surface as "Unexpected token <".
 * - 5xx responses never show the server text; only 4xx details written for users do.
 * - Network failures (fetch rejects with TypeError) get their own message.
 */

export const SUPPORT_EMAIL = "soporte@trackflow.example";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const NETWORK_MESSAGE = "No hemos podido conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/** Parses JSON without throwing: returns null when the body is empty or not JSON. */
export async function readJson<T = unknown>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function messageForStatus(status: number, fallback: string) {
  if (status === 401) return "Tu sesión ha caducado. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (status === 404) return "No hemos encontrado lo que buscabas. Puede que se haya eliminado.";
  if (status === 429) return "Demasiadas peticiones seguidas. Espera unos segundos y vuelve a intentarlo.";
  if (status >= 500) return "El servidor ha tenido un problema. Inténtalo de nuevo en unos minutos.";
  return fallback;
}

/** Extracts per-field messages from FastAPI/Pydantic (422) or { field, message } bodies. */
export function fieldErrorsFrom(body: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (typeof body !== "object" || body === null) return errors;
  const record = body as Record<string, unknown>;

  if (typeof record.field === "string" && typeof record.message === "string") {
    errors[record.field] = record.message;
  }
  if (Array.isArray(record.errors)) {
    for (const issue of record.errors) {
      if (typeof issue !== "object" || issue === null) continue;
      const { field, message } = issue as { field?: unknown; message?: unknown };
      if (typeof field === "string" && typeof message === "string") errors[field] = message;
    }
  }
  const detail = record.detail;
  if (Array.isArray(detail)) {
    for (const issue of detail) {
      if (typeof issue !== "object" || issue === null) continue;
      const loc = (issue as { loc?: unknown }).loc;
      const field = Array.isArray(loc) ? String(loc.at(-1) ?? "") : "";
      if (field) errors[field] = String((issue as { msg?: unknown }).msg ?? "Valor no válido");
    }
  }
  return errors;
}

/** Message written by the API for the user, only trusted for 4xx responses. */
function userFacingDetail(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  return null;
}

/**
 * Returns the parsed body of a successful response, or throws an ApiError
 * with a human-readable message for any failed one.
 */
export async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await readJson<unknown>(response);

  if (response.ok) {
    if (body === null && response.status !== 204) {
      throw new ApiError("El servidor ha devuelto una respuesta inesperada. Inténtalo de nuevo.", response.status);
    }
    return body as T;
  }

  const fieldErrors = response.status < 500 ? fieldErrorsFrom(body) : {};
  const detail = response.status >= 400 && response.status < 500 && response.status !== 401
    ? userFacingDetail(body)
    : null;
  const fieldSummary = Object.keys(fieldErrors).length > 0
    ? "Revisa los campos marcados en el formulario."
    : null;
  throw new ApiError(detail ?? fieldSummary ?? messageForStatus(response.status, fallback), response.status, fieldErrors);
}

/** Converts any thrown value into a message that is safe to show in the UI. */
export function toUserMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return NETWORK_MESSAGE;
  return fallback;
}
