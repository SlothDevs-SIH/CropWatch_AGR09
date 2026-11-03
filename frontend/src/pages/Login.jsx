import { useEffect, useState } from "react";
import { api, token } from "@/api";

export default function Login({ onDone, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demos, setDemos] = useState([]);

  useEffect(() => { api("/api/demo-accounts").then(setDemos).catch(() => {}); }, []);

  async function submit(e, creds) {
    e?.preventDefault();
    const c = creds || { email, password };
    setBusy(true); setErr("");
    try {
      const r = await api("/api/auth/login", c);
      token.set(r.token);
      onDone(r.user);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="card p-7 w-full max-w-md fade-up">
        <button className="text-sm mb-4" style={{ color: "var(--muted)" }} onClick={onBack}>← Back</button>
        <h2 className="text-2xl font-bold">Sign in</h2>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input className="card px-3 py-2 bg-transparent" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <input className="card px-3 py-2 bg-transparent" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {err && <div className="text-sm" style={{ color: "#d14a30" }}>{err}</div>}
          <button className="btn btn-primary py-2" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        {demos.length > 0 && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>Demo accounts (fake people, fake plot ownership)</div>
            <div className="mt-2 flex flex-col gap-2">
              {demos.map((d) => (
                <button key={d.email} className="btn text-left" onClick={() => submit(null, { email: d.email, password: d.password })}>{d.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
