"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, AuthMe, TOKEN_KEY } from "../lib/auth-client";

type SessionStatus = "checking" | "authenticated" | "public" | "unauthenticated";
type AuthContextValue = {
  status: SessionStatus;
  user: AuthMe | null;
  logout: () => void;
};
type SessionState = {
  pathname: string;
  status: SessionStatus;
  user: AuthMe | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const publicPaths = new Set(["/login", "/register"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({
    pathname: "",
    status: "checking",
    user: null,
  });
  const status = session.pathname === pathname ? session.status : "checking";
  const user = session.pathname === pathname ? session.user : null;

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ pathname, status: "unauthenticated", user: null });
      if (!publicPaths.has(pathname)) {
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
      }
    };

    window.addEventListener("trackflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trackflow:unauthorized", handleUnauthorized);
  }, [pathname, router]);

  useEffect(() => {
    if (publicPaths.has(pathname)) {
      return;
    }

    let active = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return () => { active = false; };
    }

    apiFetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("La sesión ya no es válida.");
        return response.json() as Promise<AuthMe>;
      })
      .then((currentUser) => {
        if (!active) return;
        setSession({ pathname, status: "authenticated", user: currentUser });
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setSession({ pathname, status: "unauthenticated", user: null });
        router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      });

    return () => { active = false; };
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setSession({ pathname, status: "unauthenticated", user: null });
    router.replace("/login");
  }

  return <AuthContext.Provider value={{ status, user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
