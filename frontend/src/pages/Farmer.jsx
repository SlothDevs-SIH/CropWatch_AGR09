import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import PlotPanel from "@/components/PlotPanel";
import { LEVELS } from "@/lib/levels";
import { useT } from "@/lib/i18n";

const ORDER = { urgent: 0, watch: 1, cannot_see: 2, normal: 3 };

/** The farmer's own screen: built for a phone. Their plots, what the satellite says, and a big way to answer. */
export default function Farmer({ user }) {
  const { t } = useT();
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState("");
  const [plot, setPlot] = useState(null);

  const load = useCallback(() => api(`/api/talukas/${user.home_area || user.taluka}`).then(setGeo).catch((e) => setErr(e.message)), [user]);
  useEffect(() => { load(); }, [load]);

  const open = (id) => api(`/api/plots/${id}`).then(setPlot).catch((e) => setErr(e.message));
  const changed = () => { load(); if (plot) open(plot.id); };

  if (err && !geo) return <div className="p-6" style={{ color: "var(--rust)" }}>{err}</div>;
  if (!geo) return <div className="p-6" style={{ color: "var(--muted)" }}>{t("loading")}</div>;
  const plots = geo.features.map((f) => f.properties).filter((p) => p.farmland).sort((a, b) => ORDER[a.level] - ORDER[b.level]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold">{t("yourPlots")}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{t("tapPlot")}</p>
      <div className="mt-4 flex flex-col gap-3">
        {plots.map((p) => {
          const lv = LEVELS[p.level], sk = p.status === "reported" ? "status_reported" : p.status;
          return (
            <button key={p.id} onClick={() => open(p.id)} className="card p-4 text-left slide-in" style={{ borderColor: lv.color }}>
              <div className="flex items-center gap-2 flex-wrap">
                <b className="text-lg">{p.id}</b>
                <span className="chip" style={{ color: lv.color, borderColor: lv.color }}>{t(p.level)}</span>
                {p.status !== "none" && <span className="chip">{t(sk)}</span>}
              </div>
              {p.status === "awaiting_farmer" && <div className="mt-2 text-sm" style={{ color: "var(--ochre)" }}>{t("isStressed")}</div>}
            </button>
          );
        })}
        {plots.length === 0 && <div className="text-sm" style={{ color: "var(--muted)" }}>{t("noPlots")}</div>}
      </div>

      {plot && (
        <div className="fixed inset-0 z-30" style={{ background: "var(--panel)" }}>
          <PlotPanel plot={plot} user={user} onChanged={changed} onClose={() => setPlot(null)} />
        </div>
      )}
    </div>
  );
}
