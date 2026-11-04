import { useCallback, useEffect, useState } from "react";
import { api, apiBlob } from "@/api";
import CheckForm from "@/components/CheckForm";
import Help from "@/components/Help";
import PictureCompare from "@/components/PictureCompare";
import AuthImage from "@/components/AuthImage";
import { LEVELS } from "@/lib/levels";
import { useT } from "@/lib/i18n";

const ORDER = { urgent: 0, watch: 1, cannot_see: 2, normal: 3 };
const lastAnswer = (p) => (p.checks || []).find((c) => c.kind === "farmer");

/** The farmer's screen: their land, whether it changed, and a picture to compare. No graphs, no numbers. */
export default function Farmer({ user }) {
  const { t } = useT();
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState("");
  const [plot, setPlot] = useState(null);

  const load = useCallback(() => api(`/api/talukas/${user.home_area || user.taluka}`).then(setGeo).catch((e) => setErr(e.message)), [user]);
  useEffect(() => { load(); }, [load]);

  const open = (id) => api(`/api/plots/${id}`).then(setPlot).catch((e) => setErr(e.message));
  const changed = () => { load(); if (plot) open(plot.id); };

  if (err && !geo) return <div className="p-6 text-lg" style={{ color: "var(--rust)" }}>{err}</div>;
  if (!geo) return <div className="p-6 text-lg" style={{ color: "var(--muted)" }}>{t("loading")}</div>;
  const plots = geo.features.map((f) => f.properties).filter((p) => p.farmland).sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  const needAnswer = plots.filter((p) => p.status === "awaiting_farmer").length;

  return (
    <div className="max-w-xl mx-auto p-4 pb-16">
      <h1 className="text-3xl font-bold">{t("yourLand")}</h1>
      {needAnswer > 0 && <div className="card p-4 mt-3 text-lg" style={{ borderColor: "var(--ochre)" }}>{t("fieldsNeedAnswer")}</div>}

      <div className="mt-4 flex flex-col gap-4">
        {plots.map((p, i) => {
          const lv = LEVELS[p.level];
          return (
            <button key={p.id} onClick={() => open(p.id)} className="card p-5 text-left slide-in" style={{ borderColor: lv.color, borderWidth: 2 }}>
              <div className="text-base" style={{ color: "var(--muted)" }}>{t("field")} {i + 1}{p.village ? ` · ${p.village}` : ""}</div>
              <div className="flex items-center gap-3 mt-1">
                <i style={{ background: lv.color, width: 22, height: 22, borderRadius: 99, display: "inline-block", flexShrink: 0 }} />
                <b className="text-xl leading-snug">{t(`f_${p.level}`)}</b>
              </div>
            </button>
          );
        })}
        {plots.length === 0 && <div className="text-lg" style={{ color: "var(--muted)" }}>{t("noPlots")}</div>}
      </div>

      <Help />

      {plot && (
        <div className="fixed inset-0 z-30 overflow-auto" style={{ background: "var(--panel)" }}>
          <FarmerPlot plot={plot} index={plots.findIndex((p) => p.id === plot.id) + 1} onChanged={changed} onClose={() => setPlot(null)} />
        </div>
      )}
    </div>
  );
}

function FarmerPlot({ plot, index, onChanged, onClose }) {
  const { t } = useT();
  const [msg, setMsg] = useState("");
  const lv = LEVELS[plot.level];
  const mine = lastAnswer(plot);
  const labels = { stressed: t("f_stressed"), fine: t("f_fine"), not_sure: t("f_not_sure") };

  async function report() {
    try {
      const b = await apiBlob(`/api/plots/${plot.id}/evidence`);
      window.open(URL.createObjectURL(new Blob([b], { type: "text/html" })), "_blank");
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-16 slide-in" key={plot.id}>
      <button className="btn text-lg" style={{ padding: "12px 18px" }} onClick={onClose}>← {t("back")}</button>
      <h2 className="text-3xl font-bold mt-4">{t("field")} {index || ""}</h2>

      <div className="card p-5 mt-3 flex items-center gap-3" style={{ borderColor: lv.color, borderWidth: 2 }}>
        <i style={{ background: lv.color, width: 26, height: 26, borderRadius: 99, display: "inline-block", flexShrink: 0 }} />
        <b className="text-2xl leading-snug">{t(`f_${plot.level}`)}</b>
      </div>

      {plot.centre && <PictureCompare plot={plot} simple />}

      <CheckForm plotId={plot.id} title={t("askCrop")} onDone={onChanged} big labels={labels} />
      {mine && <div className="text-base mt-2" style={{ color: "var(--muted)" }}>{t(mine.status === "stressed" ? "f_stressed" : mine.status === "fine" ? "f_fine" : "f_not_sure")} · {mine.at}</div>}
      {mine?.photo_id && <AuthImage photoId={mine.photo_id} />}

      <button className="btn w-full mt-4 text-base" style={{ padding: "14px" }} onClick={report}>{t("getReport")}</button>
      {msg && <div className="text-base mt-2" style={{ color: "var(--ochre)" }}>{msg}</div>}
    </div>
  );
}
