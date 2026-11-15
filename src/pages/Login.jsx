import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Notice } from "../components/UI";
export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState("STUDENT");
    const [email, setEmail] = useState("alex@sau-demo.edu");
    const [password, setPassword] = useState("demo-password");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const defaults = { STUDENT: "alex@sau-demo.edu", PROFESSOR: "s.chen@sau-demo.edu", ADMIN: "admin@sau-demo.edu" };
    async function submit(e) { e.preventDefault(); setBusy(true); setError(""); try {
        await login(email, password, role);
        navigate(`/${role.toLowerCase()}/dashboard`);
    }
    catch {
        setError("Unable to sign in. Check your credentials and try again.");
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("div", { className: "login-page", children: [_jsxs("div", { className: "login-decoration", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "brand-mark", children: _jsx(BookOpen, { size: 20 }) }), _jsxs("div", { children: [_jsx("strong", { children: "SOUTH ASIAN" }), _jsx("span", { children: "UNIVERSITY" })] })] }), _jsxs("div", { className: "login-message", children: [_jsx("span", { className: "eyebrow", children: "STUDENT ACADEMIC PROGRESS & SUPPORT" }), _jsxs("h1", { children: ["Your progress.", _jsx("br", {}), _jsx("em", { children: "Your next step." })] }), _jsx("p", { children: "A clearer view of your learning journey, with the right support when you need it." }), _jsxs("div", { className: "login-proof", children: [_jsx(ShieldCheck, { size: 17 }), " A thoughtful space for academic growth"] })] }), _jsx("span", { className: "login-footer", children: "\u00A9 2026 South Asian University" })] }), _jsx("div", { className: "login-form-wrap", children: _jsxs("form", { className: "login-form", onSubmit: submit, children: [_jsx("span", { className: "eyebrow", children: "WELCOME BACK" }), _jsx("h2", { children: "Sign in to your portal" }), _jsx("p", { children: "Continue where your academic journey left off." }), error && _jsx(Notice, { kind: "error", children: error }), _jsx("label", { children: "Continue as" }), _jsx("div", { className: "role-picker", children: ["STUDENT", "PROFESSOR", "ADMIN"].map(r => _jsx("button", { type: "button", className: role === r ? "selected" : "", onClick: () => { setRole(r); setEmail(defaults[r]); }, children: r[0] + r.slice(1).toLowerCase() }, r)) }), _jsx("label", { htmlFor: "email", children: "University email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: e => setEmail(e.target.value), required: true }), _jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: e => setPassword(e.target.value), required: true }), _jsxs("button", { className: "button primary full", disabled: busy, children: [busy ? "Signing in…" : "Sign in", " ", _jsx(ArrowRight, { size: 16 })] }), _jsx("small", { className: "demo-hint", children: "Demo mode: select a role and use the prefilled credentials." })] }) })] });
}
