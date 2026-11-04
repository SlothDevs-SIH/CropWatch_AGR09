import { useState } from "react";
import { api, apiBlob } from "@/api";
import Chart from "@/components/Chart";
import RainStrip from "@/components/RainStrip";
import AuthImage from "@/components/AuthImage";
import CheckForm from "@/components/CheckForm";
import PictureCompare from "@/components/PictureCompare";
import { LEVELS } from "@/lib/levels";
import { useT } from "@/lib/i18n";

export default function PlotPanel({ plot, user, onChanged, onPrev, onNext, onClose }) {
  const { t } = useT();
  const [msg, setMsg] = useState("");
  const lv = LEVELS[plot.level];
  const farmer = user.role === "farmer", officer = user.role === "taluka_officer";
  const flagged = ["watch", "urgent", "cannot_see"].includes(plot.level);
  const statusKey = plot.status === "reported" ? "status_reported" : plot.status;

  async function report() {
    setMsg("");
    try { await api(`/api/plots/${plot.id}/report`, { note: "" }); setMsg("Reported to the district office"); onChanged(); } catch (e) { setMsg(e.message); }
  }
  async function evidence() {
    try {
      const b = await apiBlob(`/api/plots/${plot.id}/evidence`);
      window.open(URL.createObjectURL(new Blob([b], { type: "text/html" })), "_blank");
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="slide-in h-full overflow-auto scroll-thin p-4" key={plot.id}>
      <div className="flex items-center gap-2">
        {onPrev && <button className="btn" onClick={onPrev} aria-label="Previous plot">←</button>}
        {onNext && <button className="btn" onClick={onNext} aria-label="Next plot">→</button>}
        
      </div>
      <h3 className="text-xl font-bold mt-3">{plot.id}</h3>
      <div className="card p-4 mt-3 flex items-center gap-3" style={{ borderColor: lv.color, borderWidth: 2 }}>
        <i style={{ background: lv.color, width: 20, height: 20, borderRadius: 99, display: "inline-block", flexShrink: 0 }} />
        <b className="text-xl">{t(`off_${plot.level}`)}</b>
        {plot.status !== "none" && <span className="chip ml-auto text-sm">{t(statusKey)}</span>}
      </div>
      <p className="mt-3 text-base">{plot.reason}</p>

      {plot.centre && !farmer && (
        <a className="btn btn-primary w-full mt-3 text-center block" style={{ padding: "14px", fontSize: "1.1rem" }} target="_blank" rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${plot.centre[1]},${plot.centre[0]}&travelmode=driving`}>
          {t("openInMaps")}
        </a>
      )}

      {plot.centre && <PictureCompare plot={plot} simple />}

      <details className="card p-3 mt-3">
        <summary className="text-base font-semibold cursor-pointer">{t("moreDetails")}</summary>
        {plot.confidence && <div className="text-sm mt-2" style={{ color: "var(--muted)" }}>Confidence: {plot.confidence}</div>}
      {plot.series_2026 && (
        <div className="card p-3 mt-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
            Greenness this season <b style={{ color: "#d14a30" }}>(red)</b> against past seasons at the same crop age <b>(dashed)</b>
          </div>
          <Chart bins={plot.bins} series={plot.series_2026} normal={plot.series_normal} />
          <div className="text-xs" style={{ color: "var(--muted)" }}>Gaps in the line are weeks with no clear satellite picture.</div>
        </div>
      )}
      <div className="mt-3"><RainStrip taluka={plot.taluka} /></div>

        {(officer || farmer) && <button className="btn w-full mt-3 text-sm" onClick={evidence}>Open the evidence pack</button>}
      </details>

      {flagged && (farmer || officer) && <CheckForm plotId={plot.id} title={farmer ? t("isStressed") : t("recordVisit")} onDone={onChanged} big />}

      {officer && flagged && (
        <div className="card p-3 mt-3">
          <button className="btn btn-primary w-full" disabled={plot.status !== "confirmed" || !!plot.report} onClick={report}>
            {plot.report ? t("status_reported") : t("reportToDistrict")}
          </button>
          {plot.status !== "confirmed" && !plot.report && (
            <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>A plot can be reported only after the farmer or a field visit confirms stress.</div>
          )}
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Reporting tells the district office, with the evidence. It does not file a claim.</div>
        </div>
      )}
      {msg && <div className="text-sm mt-2" style={{ color: "var(--ochre)" }}>{msg}</div>}

      {plot.checks?.length > 0 && (
        <div className="mt-4">
          <b className="text-sm">History</b>
          {plot.checks.map((c) => (
            <div key={c.id} className="card p-2 mt-2 text-sm">
              <b>{c.kind === "farmer" ? "Farmer" : "Field visit"}: {t(c.status)}</b>
              <span style={{ color: "var(--muted)" }}> · {c.by_name} · {c.at}</span>
              {c.note && <div style={{ color: "var(--muted)" }}>{c.note}</div>}
              {c.photo_id && <AuthImage photoId={c.photo_id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
