import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  BarChart3,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

const studentNav = [
  ["/student/dashboard", "Dashboard", LayoutDashboard],
  ["/student/progress", "Academic Progress", BarChart3],
  ["/student/slots", "Support Slot Browser", CalendarDays],
  ["/student/requests", "My Requests", ClipboardList],
  ["/student/history", "Academic Timeline", Activity],
  ["/student/profile", "Profile", UserRound],
] as const;

const professorNav = [
  ["/professor/dashboard", "Dashboard", LayoutDashboard],
  ["/professor/slots", "Manage Slots", CalendarDays],
  ["/professor/requests", "Request Inbox", ClipboardList],
  ["/professor/reschedule", "To Reschedule", Activity],
  ["/professor/grades", "Grade Management", GraduationCap],
  ["/professor/students", "Student History", Users],
] as const;

const adminNav = [
  ["/admin/dashboard", "Overview", LayoutDashboard],
  ["/admin/users", "User Management", Users],
  ["/admin/audit", "Audit Verification", ShieldCheck],
] as const;

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const nav =
    user.role === "STUDENT"
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

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BookOpen size={19} /></div>
          <div>
            <strong>SOUTH ASIAN</strong>
            <span>UNIVERSITY</span>
          </div>
          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-caption">{roleLabel} portal</div>
        <nav className="side-nav">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "My Requests" && user.role === "STUDENT" ? (
                <small className="nav-count">3</small>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>A little guidance?</strong>
            <p>Your academic team is here when you need them.</p>
            <a href="mailto:support@sau-demo.edu">Contact support <span>↗</span></a>
          </div>
          <button type="button" className="logout-link" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
          <small className="copyright">© 2026 South Asian University</small>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="greeting">
            <strong>Good morning, {user.name.split(" ")[0]}.</strong>
            <span>Let's make today a productive one.</span>
          </div>

          <div className="topbar-actions">
            <div className="term-chip">
              <CalendarDays size={14} /> Fall 2026 · Semester 5
            </div>

            <div className="topbar-popover-anchor">
              <button
                type="button"
                className={`icon-button ${notificationsOpen ? "is-open" : ""}`}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                <Bell size={18} />
                <i />
              </button>

              {notificationsOpen && (
                <section className="topbar-popover" aria-label="Notifications">
                  <div className="popover-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>Updates from your academic portal</small>
                    </div>
                  </div>
                  <div className="popover-empty">
                    No notifications yet. Updates will appear here when the
                    notification service is connected.
                  </div>
                  <div className="popover-footnote">
                    Notification delivery is not connected to the backend yet.
                  </div>
                </section>
              )}
            </div>

            <div className="topbar-divider" />

            <div className="topbar-popover-anchor">
              <button
                type="button"
                className={`profile-chip ${profileOpen ? "is-open" : ""}`}
                aria-expanded={profileOpen}
                aria-label="Open student profile menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <div className="avatar">{user.initials}</div>
                <div>
                  <strong>{user.name}</strong>
                  <span>{roleLabel}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {profileOpen && (
                <section className="topbar-popover profile-popover" aria-label="Account menu">
                  <div className="profile-popover-user">
                    <div className="avatar">{user.initials}</div>
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                      <span>{roleLabel} account</span>
                    </div>
                  </div>
                  {user.role === "STUDENT" && (
                    <Link to="/student/profile" onClick={closeTopbarMenus}>
                      <UserRound size={15} /> View profile
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={15} /> Log out
                  </button>
                </section>
              )}
            </div>
          </div>
        </header>

        <main className="content"><Outlet /></main>
        <footer className="page-footer">
          <span>South Asian University · Academic Support Portal</span>
          <span>Academic year 2026–2027 <b>·</b> Your progress matters.</span>
        </footer>
      </div>
    </div>
  );
}
