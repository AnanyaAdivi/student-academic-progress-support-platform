import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireRole } from "./auth/Guards";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { StudentDashboard, SlotBrowser, MyRequests, ProgressPage, TimelinePage, ProfilePage } from "./pages/Student";
import { ProfessorDashboard, ProfessorSlots, ProfessorRequests, GradeManagement, StudentHistoryProfessor } from "./pages/Professor";
import AdminDashboard from "./pages/Admin";
function RoleLayout() { return <Layout/>; }
export default function App() {
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<RequireAuth/>}><Route element={<RoleLayout/>}>
      <Route element={<RequireRole roles={["STUDENT"]}/>}>
        <Route path="/student/dashboard" element={<StudentDashboard/>}/>
        <Route path="/student/slots" element={<SlotBrowser/>}/>
        <Route path="/student/requests" element={<MyRequests/>}/>
        <Route path="/student/progress" element={<ProgressPage/>}/>
        <Route path="/student/history" element={<TimelinePage/>}/>
        <Route path="/student/profile" element={<ProfilePage/>}/>
      </Route>
      <Route element={<RequireRole roles={["PROFESSOR"]}/>}>
        <Route path="/professor/dashboard" element={<ProfessorDashboard/>}/>
        <Route path="/professor/slots" element={<ProfessorSlots/>}/>
        <Route path="/professor/requests" element={<ProfessorRequests/>}/>
        <Route path="/professor/reschedule" element={<ProfessorRequests onlyReschedule/>}/>
        <Route path="/professor/grades" element={<GradeManagement/>}/>
        <Route path="/professor/students" element={<StudentHistoryProfessor/>}/>
      </Route>
      <Route element={<RequireRole roles={["ADMIN"]}/>}>
        <Route path="/admin/dashboard" element={<AdminDashboard/>}/>
        <Route path="/admin/users" element={<AdminDashboard/>}/>
        <Route path="/admin/audit" element={<AdminDashboard/>}/>
      </Route>
    </Route></Route>
    <Route path="/" element={<Navigate to="/login" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
