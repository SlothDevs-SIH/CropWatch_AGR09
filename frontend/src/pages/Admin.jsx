import { useEffect, useState } from "react";
import { api } from "@/api";

const ROLES = [["taluka_officer", "Taluka officer"], ["district_officer", "District officer"], ["farmer", "Farmer"], ["centre_operator", "Service centre operator"]];

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState([]);
  const [areas, setAreas] = useState([]);
  const [acc, setAcc] = useState(null);
  const [f, setF] = useState({ email: "", name: "", role: "taluka_officer", taluka: "", password: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    api("/api/admin/stats").then(setStats).catch(() => {});
    api("/api/audit?limit=60").then(setAudit).catch(() => {});
  };
  useEffect(() => {
    load();
    api("/api/areas").then((a) => setAreas([...new Set(a.map((x) => x.parent))].sort())).catch(() => {});
    fetch("/api/accuracy").then((r) => r.json()).then(setAcc).catch(() => {});
  }, []);

  async function create(e) {
    e.preventDefault(); setMsg("");
    try { await api("/api/admin/users", { ...f, taluka: f.role === "district_officer" ? null : f.taluka }); setMsg("User created."); setF({ ...f, email: "", name: "", password: "" }); load(); }
    catch (x) { setMsg(x.message); }
  }
  const input = "card px-3 py-2 bg-transparent w-full";

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-center">
        {stats && Object.entries(stats).map(([k, v]) => <div key={k} className="card py-2"><b className="text-lg">{v}</b><div className="text-[11px]" style={{ color: "var(--muted)" }}>{k}</div></div>)}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <form onSubmit={create} className="card p-4 flex flex-col gap-2">
          <b>Create a user</b>
          <input className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input className={input} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map(([k, l]) => <option key={k} value={k} style={{ color: "#000" }}>{l}</option>)}</select>
          {f.role !== "district_officer" && (
            <select className={input} value={f.taluka} onChange={(e) => setF({ ...f, taluka: e.target.value })} required>
              <option value="" style={{ color: "#000" }}>Taluka…</option>{areas.map((a) => <option key={a} value={a} style={{ color: "#000" }}>{a}</option>)}
            </select>
          )}
          <input className={input} type="password" placeholder="Password (10+ characters, a letter and a digit)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <button className="btn btn-primary">Create</button>
          {msg && <div className="text-sm" style={{ color: "var(--ochre)" }}>{msg}</div>}
          <div className="text-xs" style={{ color: "var(--muted)" }}>Create farmer accounts only with consent. Store no phone or ID numbers.</div>
        </form>

        <div className="card p-4">
          <b>Evidence status</b>
          {acc?.measured ? (
            <ul className="text-sm mt-2 flex flex-col gap-1" style={{ color: "var(--muted)" }}>
              <li>Seasons used: {acc.seasons_used?.join(", ")}</li>
              <li>Flagged in 2026 test season: <b style={{ color: "var(--text)" }}>{Math.round((acc.flagged_in_2026_test_season || 0) * 100)}%</b>; false alarms in ordinary seasons: <b style={{ color: "var(--text)" }}>{Math.round((acc.false_alarm_in_ordinary_seasons?.value || 0) * 100)}%</b></li>
              <li>Field check: {acc.field_check ? `${acc.field_check.plots_visited} plots visited` : <b style={{ color: "var(--ochre)" }}>no field observations yet</b>}</li>
            </ul>
          ) : <div className="text-sm mt-2" style={{ color: "var(--muted)" }}>No backtest yet.</div>}
        </div>
      </div>

      <h2 className="text-lg font-bold mt-8">Audit log (latest)</h2>
      <div className="card mt-2 overflow-auto" style={{ maxHeight: 360 }}>
        <table className="w-full text-xs">
          <thead style={{ color: "var(--muted)" }}><tr><th className="text-left p-2">When</th><th className="text-left p-2">Who</th><th className="text-left p-2">Role</th><th className="text-left p-2">Action</th><th className="text-left p-2">Detail</th></tr></thead>
          <tbody>{audit.map((a) => <tr key={a.id} className="border-t" style={{ borderColor: "var(--line)" }}><td className="p-2">{a.at}</td><td className="p-2">{a.who}</td><td className="p-2">{a.role}</td><td className="p-2"><b>{a.action}</b></td><td className="p-2" style={{ color: "var(--muted)" }}>{a.detail}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
