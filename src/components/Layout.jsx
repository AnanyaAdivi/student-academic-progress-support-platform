import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { Activity, Bell, BookOpen, CalendarDays, BarChart3, ChevronDown, ClipboardList, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, Users, UserRound, Menu, X, } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
const studentNav = [
    ["/student/dashboard", "Dashboard", LayoutDashboard],
    ["/student/progress", "Academic Progress", BarChart3],
    ["/student/slots", "Support Slot Browser", CalendarDays],
    ["/student/requests", "My Requests", ClipboardList],
    ["/student/history", "Academic Timeline", Activity],
    ["/student/profile", "Profile", UserRound],
];
const professorNav = [
    ["/professor/dashboard", "Dashboard", LayoutDashboard],
    ["/professor/slots", "Manage Slots", CalendarDays],
    ["/professor/requests", "Request Inbox", ClipboardList],
    ["/professor/reschedule", "To Reschedule", Activity],
    ["/professor/grades", "Grade Management", GraduationCap],
    ["/professor/students", "Student History", Users],
];
const adminNav = [
    ["/admin/dashboard", "Overview", LayoutDashboard],
    ["/admin/users", "User Management", Users],
    ["/admin/audit", "Audit Verification", ShieldCheck],
];
export default function Layout() {
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const navigate = useNavigate();
    if (!user)
        return null;
    const nav = user.role === "STUDENT"
        ? studentNav
        : user.role === "PROFESSOR"
            ? professorNav
            : adminNav;
    const roleLabel = user.role[0] + user.role.slice(1).toLowerCase();
    const closeTopbarMenus = () => {
        setNotificationsOpen(false);
        setProfileOpen(false);
    };
    const handleLogout = async () => {
        closeTopbarMenus();
        await logout();
        navigate("/login");
    };
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: `sidebar ${mobileOpen ? "sidebar-open" : ""}`, children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-mark", children: _jsx(BookOpen, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { children: "SOUTH ASIAN" }), _jsx("span", { children: "UNIVERSITY" })] }), _jsx("button", { type: "button", className: "mobile-close", onClick: () => setMobileOpen(false), "aria-label": "Close navigation", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "nav-caption", children: [roleLabel, " portal"] }), _jsx("nav", { className: "side-nav", children: nav.map(([to, label, Icon]) => (_jsxs(NavLink, { to: to, onClick: () => setMobileOpen(false), className: ({ isActive }) => `nav-link ${isActive ? "active" : ""}`, children: [_jsx(Icon, { size: 17 }), _jsx("span", { children: label }), label === "My Requests" && user.role === "STUDENT" ? (_jsx("small", { className: "nav-count", children: "3" })) : null] }, to))) }), _jsxs("div", { className: "sidebar-bottom", children: [_jsxs("div", { className: "help-card", children: [_jsx("div", { className: "help-icon", children: "?" }), _jsx("strong", { children: "A little guidance?" }), _jsx("p", { children: "Your academic team is here when you need them." }), _jsxs("a", { href: "mailto:support@sau-demo.edu", children: ["Contact support ", _jsx("span", { children: "\u2197" })] })] }), _jsxs("button", { type: "button", className: "logout-link", onClick: handleLogout, children: [_jsx(LogOut, { size: 16 }), " Logout"] }), _jsx("small", { className: "copyright", children: "\u00A9 2026 South Asian University" })] })] }), mobileOpen && (_jsx("button", { type: "button", className: "mobile-scrim", onClick: () => setMobileOpen(false), "aria-label": "Close navigation" })), _jsxs("div", { className: "main-area", children: [_jsxs("header", { className: "topbar", children: [_jsx("button", { type: "button", className: "mobile-menu", onClick: () => setMobileOpen(true), "aria-label": "Open navigation", children: _jsx(Menu, { size: 20 }) }), _jsxs("div", { className: "greeting", children: [_jsxs("strong", { children: ["Good morning, ", user.name.split(" ")[0], "."] }), _jsx("span", { children: "Let's make today a productive one." })] }), _jsxs("div", { className: "topbar-actions", children: [_jsxs("div", { className: "term-chip", children: [_jsx(CalendarDays, { size: 14 }), " Fall 2026 \u00B7 Semester 5"] }), _jsxs("div", { className: "topbar-popover-anchor", children: [_jsxs("button", { type: "button", className: `icon-button ${notificationsOpen ? "is-open" : ""}`, "aria-label": "Open notifications", "aria-expanded": notificationsOpen, onClick: () => {
                                                    setNotificationsOpen((open) => !open);
                                                    setProfileOpen(false);
                                                }, children: [_jsx(Bell, { size: 18 }), _jsx("i", {})] }), notificationsOpen && (_jsxs("section", { className: "topbar-popover", "aria-label": "Notifications", children: [_jsx("div", { className: "popover-heading", children: _jsxs("div", { children: [_jsx("strong", { children: "Notifications" }), _jsx("small", { children: "Updates from your academic portal" })] }) }), _jsx("div", { className: "popover-empty", children: "No notifications yet. Updates will appear here when the notification service is connected." }), _jsx("div", { className: "popover-footnote", children: "Notification delivery is not connected to the backend yet." })] }))] }), _jsx("div", { className: "topbar-divider" }), _jsxs("div", { className: "topbar-popover-anchor", children: [_jsxs("button", { type: "button", className: `profile-chip ${profileOpen ? "is-open" : ""}`, "aria-expanded": profileOpen, "aria-label": "Open student profile menu", onClick: () => {
                                                    setProfileOpen((open) => !open);
                                                    setNotificationsOpen(false);
                                                }, children: [_jsx("div", { className: "avatar", children: user.initials }), _jsxs("div", { children: [_jsx("strong", { children: user.name }), _jsx("span", { children: roleLabel })] }), _jsx(ChevronDown, { size: 14 })] }), profileOpen && (_jsxs("section", { className: "topbar-popover profile-popover", "aria-label": "Account menu", children: [_jsxs("div", { className: "profile-popover-user", children: [_jsx("div", { className: "avatar", children: user.initials }), _jsxs("div", { children: [_jsx("strong", { children: user.name }), _jsx("small", { children: user.email }), _jsxs("span", { children: [roleLabel, " account"] })] })] }), user.role === "STUDENT" && (_jsxs(Link, { to: "/student/profile", onClick: closeTopbarMenus, children: [_jsx(UserRound, { size: 15 }), " View profile"] })), _jsxs("button", { type: "button", onClick: handleLogout, children: [_jsx(LogOut, { size: 15 }), " Log out"] })] }))] })] })] }), _jsx("main", { className: "content", children: _jsx(Outlet, {}) }), _jsxs("footer", { className: "page-footer", children: [_jsx("span", { children: "South Asian University \u00B7 Academic Support Portal" }), _jsxs("span", { children: ["Academic year 2026\u20132027 ", _jsx("b", { children: "\u00B7" }), " Your progress matters."] })] })] })] }));
}
