import { useEffect, useState } from "react";
import { api } from "@/api";
import { useT } from "@/lib/i18n";

/** Farmer questions waiting for an answer. Unanswered ones come first. */
export default function Questions() {
  const { t } = useT();
  const [rows, setRows] = useState(null);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState("");
  const load = () => api("/api/support").then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function send(id) {
    setMsg("");
    try { await api(`/api/support/${id}/answer`, { text: draft[id] || "" }); setDraft((d) => ({ ...d, [id]: "" })); load(); } catch (e) { setMsg(e.message); }
  }
  if (!rows) return <div className="p-6 text-lg" style={{ color: "var(--muted)" }}>{t("loading")}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      <h1 className="text-3xl font-bold">{t("questions")}</h1>
      {msg && <div className="text-base mt-2" style={{ color: "var(--ochre)" }}>{msg}</div>}
      {rows.length === 0 && <div className="card p-5 mt-4 text-lg" style={{ color: "var(--muted)" }}>{t("nothingToAnswer")}</div>}
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((q) => (
          <div key={q.id} className="card p-4" style={{ borderColor: q.answer ? undefined : "var(--ochre)" }}>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{q.by} · {q.taluka} · {q.at}</div>
            <b className="text-lg block mt-1">{q.text}</b>
            {q.answer ? (
              <p className="text-base mt-2"><span style={{ color: "var(--leaf)" }}>{t("answerLabel")}:</span> {q.answer} <span className="text-sm" style={{ color: "var(--muted)" }}>({q.answered_by})</span></p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <textarea className="card w-full p-3 bg-transparent text-base" rows={2} maxLength={800} value={draft[q.id] || ""} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} />
                <button className="btn btn-primary" style={{ padding: "12px" }} disabled={!(draft[q.id] || "").trim()} onClick={() => send(q.id)}>{t("answerBtn")}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
