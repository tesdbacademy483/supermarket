import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Notice from "../components/Notice.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(username, password);
      nav(["OWNER", "MANAGER"].includes(u.role) ? "/dashboard" : "/billing", { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>{import.meta.env.VITE_SHOP_NAME || "Supermarket"}</h1>
        <p className="muted">Sign in to start billing.</p>
        <label className="field"><span>Username</span>
          <input className="input" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="field"><span>Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <Notice error={error} />
        <button className="btn primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
