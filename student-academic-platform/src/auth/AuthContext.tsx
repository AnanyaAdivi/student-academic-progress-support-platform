import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api";
import type { User, Role } from "../types";
import { isMockMode } from "../api/client";

type AuthValue = { user: User | null; loading: boolean; login: (email: string, password: string, role: Role) => Promise<void>; logout: () => Promise<void>; };
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (isMockMode) {
      try { const saved = localStorage.getItem("sap_mock_state"); if (saved) setUser(JSON.parse(saved).user || null); } catch { /* ignore */ }
      setLoading(false); return;
    }
    authApi.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
    const handler = () => setUser(null);
    window.addEventListener("sap:unauthenticated", handler);
    return () => window.removeEventListener("sap:unauthenticated", handler);
  }, []);
  const value = useMemo<AuthValue>(() => ({
    user, loading,
    login: async (email, password, role) => { const result = await authApi.login(email, password, role); setUser(result.user); },
    logout: async () => { await authApi.logout(); setUser(null); }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be inside AuthProvider"); return value; }
