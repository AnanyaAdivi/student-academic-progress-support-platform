import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
export function RequireAuth() { const { user, loading } = useAuth(); if (loading)
    return _jsx("div", { className: "page-loading", children: "Loading your workspace\u2026" }); return user ? _jsx(Outlet, {}) : _jsx(Navigate, { to: "/login", replace: true }); }
export function RequireRole({ roles }) { const { user } = useAuth(); return user && roles.includes(user.role) ? _jsx(Outlet, {}) : _jsx(Navigate, { to: user ? `/${user.role.toLowerCase()}/dashboard` : "/login", replace: true }); }
