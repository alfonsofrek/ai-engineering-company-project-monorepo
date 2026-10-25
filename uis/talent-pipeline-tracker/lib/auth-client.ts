export const TOKEN_KEY = "trackflow_access_token";

export type AuthMe = {
  email: string;
  role: "admin" | "manager" | "user";
  profile: {
    id: number;
    user_id: number;
    name: string | null;
    phone: string | null;
    address: string | null;
  };
};

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
