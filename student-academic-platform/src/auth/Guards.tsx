import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../types";
export function RequireAuth() { const { user, loading } = useAuth(); if (loading) return <div className="page-loading">Loading your workspace…</div>; return user ? <Outlet /> : <Navigate to="/login" replace />; }
export function RequireRole({ roles }: { roles: Role[] }) { const { user } = useAuth(); return user && roles.includes(user.role) ? <Outlet /> : <Navigate to={user ? `/${user.role.toLowerCase()}/dashboard` : "/login"} replace />; }
