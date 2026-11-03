import { useState } from "react";
import { api } from "@/api";
import Chart from "@/components/Chart";
import { LEVELS, STATUS } from "@/lib/levels";

const CHOICES = [["stressed", "Stressed"], ["fine", "Fine"], ["not_sure", "Not sure"]];

export default function PlotPanel({ plot, user, onChanged, onPrev, onNext, onClose }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const lv = LEVELS[plot.level];
  const farmer = user.role === "farmer", officer = user.role === "taluka_officer";
  const flagged = ["watch", "urgent", "cannot_see"].includes(plot.level);

  async function send(path, body, ok) {
    setMsg("");
    try { await api(path, body); setNote(""); setMsg(ok); onChanged(); } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="slide-in h-full overflow-auto scroll-thin p-4" key={plot.id}>
      <div className="flex items-center gap-2">
        <button className="btn" onClick={onPrev} title="Previous plot">←</button>
        <button className="btn" onClick={onNext} title="Next plot">→</button>
        <button className="btn ml-auto" onClick={onClose}>Close</button>
      </div>
      <h3 className="text-xl font-bold mt-3">Plot {plot.id}</h3>
      <div className="text-xs" style={{ color: "var(--muted)" }}>Plot-sized cell (200 m × 200 m), not a legal survey plot</div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <span className="chip" style={{ color: lv.color, borderColor: lv.color }}>{lv.label}</span>
        {plot.status !== "none" && <span className="chip">{STATUS[plot.status]}</span>}
        {plot.confidence && <span className="chip" style={{ color: "var(--muted)" }}>Confidence: {plot.confidence}</span>}
      </div>
      <p className="mt-3 text-sm">{plot.reason}</p>

      {plot.series_2026 && (
        <div className="card p-3 mt-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Greenness this season <b style={{ color: "#d14a30" }}>(red)</b> against the 2023–2025 average <b>(dashed)</b></div>
          <Chart bins={plot.bins} series={plot.series_2026} normal={plot.series_normal} />
          <div className="text-xs" style={{ color: "var(--muted)" }}>Gaps in the line are weeks with no clear satellite picture.</div>
        </div>
      )}

      {flagged && (farmer || officer) && (
        <div className="card p-3 mt-4">
          <b className="text-sm">{farmer ? "Is this plot stressed?" : "Record a field visit"}</b>
          <textarea className="card w-full mt-2 p-2 bg-transparent text-sm" rows={2} placeholder="Short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-2 flex gap-2">
            {CHOICES.map(([k, l]) => (
              <button key={k} className="btn flex-1" onClick={() => send(`/api/plots/${plot.id}/checks`, { status: k, note }, "Saved")}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {officer && flagged && (
        <div className="card p-3 mt-3">
          <button className="btn btn-primary w-full" disabled={plot.status !== "confirmed" || !!plot.report}
            onClick={() => send(`/api/plots/${plot.id}/report`, { note: "" }, "Reported to the district office")}>
            {plot.report ? "Reported to district" : "Report to district"}
          </button>
          {plot.status !== "confirmed" && !plot.report && (
            <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>A plot can be reported only after the farmer or a field visit confirms stress.</div>
          )}
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Reporting tells the district office, with the evidence. It does not file a claim.</div>
        </div>
      )}
      {msg && <div className="text-sm mt-2" style={{ color: "#e5a823" }}>{msg}</div>}

      {plot.checks?.length > 0 && (
        <div className="mt-4">
          <b className="text-sm">History</b>
          {plot.checks.map((c) => (
            <div key={c.id} className="card p-2 mt-2 text-sm">
              <b>{c.kind === "farmer" ? "Farmer" : "Field visit"}: {c.status.replace("_", " ")}</b>
              <span style={{ color: "var(--muted)" }}> · {c.by_name} · {c.at}</span>
              {c.note && <div style={{ color: "var(--muted)" }}>{c.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
