import { useEffect, useState } from "react";
import { api } from "@/api";
import { go } from "@/lib/router";
import { useT } from "@/lib/i18n";

/** Plots a taluka officer has reported to the district after a farmer or a field visit confirmed stress. */
export default function Reported() {
  const { t } = useT();
  const [rows, setRows] = useState(null);
  useEffect(() => { api("/api/reported").then(setRows).catch(() => setRows([])); }, []);
  if (!rows) return <div className="p-6" style={{ color: "var(--muted)" }}>{t("loading")}</div>;
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold">{t("reported")} plots</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Each was confirmed by the farmer or a field visit and then reported by the taluka officer. A report tells the district office. It does not file a claim.</p>
      <div className="card mt-4 overflow-hidden">
        {rows.map((r) => (
          <button key={r.plot_id} onClick={() => go(`/app/area/${r.area || r.taluka}?plot=${r.plot_id}`)} className="w-full text-left grid grid-cols-[1.2fr_1fr_1.4fr] gap-2 px-4 py-3 border-b text-sm" style={{ borderColor: "var(--line)" }}>
            <b>{r.plot_id}</b><span>{r.taluka}</span><span style={{ color: "var(--muted)" }}>{r.by_name} · {r.at}</span>
          </button>
        ))}
        {rows.length === 0 && <div className="px-4 py-4 text-sm" style={{ color: "var(--muted)" }}>Nothing reported yet.</div>}
      </div>
    </div>
  );
}
