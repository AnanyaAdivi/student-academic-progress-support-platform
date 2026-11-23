import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api";
import { isMockMode } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isMockMode) {
            try {
                const saved = localStorage.getItem("sap_mock_state");
                if (saved)
                    setUser(JSON.parse(saved).user || null);
            }
            catch { /* ignore */ }
            setLoading(false);
            return;
        }
        authApi.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
        const handler = () => setUser(null);
        window.addEventListener("sap:unauthenticated", handler);
        return () => window.removeEventListener("sap:unauthenticated", handler);
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        login: async (email, password, role) => {
            const result = await authApi.login(email, password, role);
            if (role && result.user?.role !== role) {
                await authApi.logout().catch(() => {});
                setUser(null);
                throw new Error(`This account cannot sign in to the ${role.toLowerCase()} portal.`);
            }
            setUser(result.user);
            return result.user;
        },
        logout: async () => {
            await authApi.logout();
            setUser(null);
        }
    }), [user, loading]);

    return _jsx(AuthContext.Provider, { value: value, children: children });
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value)
        throw new Error("useAuth must be inside AuthProvider");
    return value;
}