
import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth, RequireRole } from "./auth/Guards";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import {
  StudentDashboard,
  SlotBrowser,
  MyRequests,
  ProgressPage,
  TimelinePage,
  ProfilePage,
} from "./pages/Student";

import {
  ProfessorDashboard,
  ProfessorSlots,
  ProfessorRequests,
  GradeManagement,
} from "./pages/Professor";

import AdminDashboard, {
  AdminUsers,
  AdminAudit,
} from "./pages/Admin";

function RoleLayout() {
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated routes */}
      <Route element={<RequireAuth />}>
        <Route element={<RoleLayout />}>

          {/* STUDENT PORTAL */}
          <Route element={<RequireRole roles={["STUDENT"]} />}>
            <Route
              path="/student/dashboard"
              element={<StudentDashboard />}
            />

            <Route
              path="/student/slots"
              element={<SlotBrowser />}
            />

            <Route
              path="/student/requests"
              element={<MyRequests />}
            />

            <Route
              path="/student/progress"
              element={<ProgressPage />}
            />

            <Route
              path="/student/history"
              element={<TimelinePage />}
            />

            <Route
              path="/student/profile"
              element={<ProfilePage />}
            />
          </Route>

          {/* PROFESSOR PORTAL */}
          <Route element={<RequireRole roles={["PROFESSOR"]} />}>
            <Route
              path="/professor/dashboard"
              element={<ProfessorDashboard />}
            />

            <Route
              path="/professor/slots"
              element={<ProfessorSlots />}
            />

            <Route
              path="/professor/requests"
              element={<ProfessorRequests />}
            />

            <Route
              path="/professor/reschedule"
              element={<ProfessorRequests onlyReschedule={true} />}
            />

            <Route
              path="/professor/grades"
              element={<GradeManagement />}
            />
          </Route>

          {/* ADMIN PORTAL */}
          <Route element={<RequireRole roles={["ADMIN"]} />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />

            <Route
              path="/admin/audit"
              element={<AdminAudit />}
            />
          </Route>

        </Route>
      </Route>

      {/* Default routes */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
