"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch, AuthMe, TOKEN_KEY } from "@/lib/auth-client";
import { ApiError, parseResponse, toUserMessage } from "@/lib/http";

type SessionStatus = "checking" | "authenticated" | "public" | "unauthenticated" | "error";
type SessionState = { pathname: string; status: SessionStatus; user: AuthMe | null; errorMessage?: string };
type AuthContextValue = {
  status: SessionStatus;
  user: AuthMe | null;
  errorMessage: string;
  retry: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const publicPaths = new Set(["/login", "/register"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ pathname: "", status: "checking", user: null });
  const status = session.pathname === pathname ? session.status : "checking";
  const user = session.pathname === pathname ? session.user : null;
  const errorMessage = session.pathname === pathname ? session.errorMessage ?? "" : "";
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ pathname, status: "unauthenticated", user: null });
      if (!publicPaths.has(pathname)) router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    };
    window.addEventListener("trackflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trackflow:unauthorized", handleUnauthorized);
  }, [pathname, router]);

  useEffect(() => {
    if (publicPaths.has(pathname)) return;
    let active = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return () => { active = false; };
    }

    authFetch("/api/auth/me")
      .then((response) => parseResponse<AuthMe>(response, "No se pudo comprobar tu sesión."))
      .then((currentUser) => {
        if (active) setSession({ pathname, status: "authenticated", user: currentUser });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Only 401/403 means the session is invalid; a network error or 5xx keeps the
        // token and shows a retry instead of silently logging the user out.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          localStorage.removeItem(TOKEN_KEY);
          setSession({ pathname, status: "unauthenticated", user: null });
          router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
          return;
        }
        setSession({ pathname, status: "error", user: null, errorMessage: toUserMessage(error, "No se pudo comprobar tu sesión.") });
      });
    return () => { active = false; };
  }, [pathname, router, attempt]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setSession({ pathname, status: "unauthenticated", user: null });
    router.replace("/login");
  }

  function retry() {
    setSession({ pathname, status: "checking", user: null });
    setAttempt((current) => current + 1);
  }

  return <AuthContext.Provider value={{ status, user, errorMessage, retry, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
