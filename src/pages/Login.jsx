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

  const defaults = {
    STUDENT: "alex@sau-demo.edu",
    PROFESSOR: "s.chen@sau-demo.edu",
    ADMIN: "admin@sau-demo.edu",
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const signedInUser = await login(email, password, role);
      navigate(`/${signedInUser.role.toLowerCase()}/dashboard`, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to sign in. Check your credentials and try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      {/* ---------- Left: Decorative panel ---------- */}
      <div className="login-decoration">
        <div className="login-brand">
          <div className="brand-mark">
            <BookOpen size={20} />
          </div>
          <div>
            <strong>SOUTH ASIAN</strong>
            <span>UNIVERSITY</span>
          </div>
        </div>

        <div className="login-message">
          <span className="eyebrow">
            STUDENT ACADEMIC PROGRESS & SUPPORT
          </span>

          <h1>
            Your progress.
            <br />
            <em>Your next step.</em>
          </h1>

          <p>
            A clearer view of your learning journey, with the right support
            when you need it.
          </p>

          <div className="login-proof">
            <ShieldCheck size={17} /> A thoughtful space for academic growth
          </div>
        </div>

        <span className="login-footer">© 2026 South Asian University</span>
      </div>

      {/* ---------- Right: Form panel ---------- */}
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your portal</h2>
          <p>Continue where your academic journey left off.</p>

          {error && <Notice kind="error">{error}</Notice>}

          <label>Continue as</label>
          <div className="role-picker">
            {["STUDENT", "PROFESSOR", "ADMIN"].map((r) => (
              <button
                key={r}
                type="button"
                className={role === r ? "selected" : ""}
                onClick={() => {
                  setRole(r);
                  setEmail(defaults[r]);
                  setError("");
                }}
              >
                {r[0] + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <label htmlFor="email">University email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
          </button>

          <small className="demo-hint">
            Demo mode: select a role and use the prefilled credentials.
          </small>
        </form>
      </div>
    </div>
  );
}