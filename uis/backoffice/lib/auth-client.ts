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

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token && typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("trackflow:unauthorized"));
  }
  return response;
}

export function errorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((issue) => {
        if (typeof issue !== "object" || issue === null) return String(issue);
        const field = Array.isArray(issue.loc) ? String(issue.loc.at(-1) ?? "") : "";
        return `${field ? `${field}: ` : ""}${String(issue.msg ?? "Valor inválido")}`;
      }).join(" ");
    }
  }
  return fallback;
}
