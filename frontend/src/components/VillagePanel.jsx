import { LEVELS } from "@/lib/levels";
import { useT } from "@/lib/i18n";

const ORDER = { urgent: 0, watch: 1, cannot_see: 2, normal: 3 };

/** One whole village: how its plots are doing, the worst plots to open, and an honest note about ownership. */
export default function VillagePanel({ village, plots, onOpenPlot, onClose }) {
  const { t } = useT();
  const c = { urgent: 0, watch: 0, normal: 0, cannot_see: 0 };
  plots.forEach((p) => { if (c[p.level] != null) c[p.level]++; });
  const seen = c.urgent + c.watch + c.normal;
  const pct = seen ? Math.round(((c.urgent + c.watch) / seen) * 100) : null;
  const worst = [...plots].sort((a, b) => ORDER[a.level] - ORDER[b.level] || (a.deviation ?? 0) - (b.deviation ?? 0)).slice(0, 8);
  const [lon, lat] = village.centre;

  return (
    <div className="slide-in h-full overflow-auto scroll-thin p-4" key={village.id}>
      <div className="flex items-center gap-2">
        <button className="btn ml-auto" onClick={onClose} style={{ padding: "10px 16px", fontSize: "1rem" }}>{t("close")}</button>
      </div>
      <h3 className="text-2xl font-bold mt-2">{t("village")} {village.name}</h3>
      <div className="text-sm" style={{ color: "var(--muted)" }}>{village.taluka} · {plots.length} {t("plotsWord")} · {t("aboutHa").replace("{ha}", Number(village.ha).toLocaleString())}</div>

      {pct != null ? (
        <div className="mt-3 flex items-baseline gap-2">
          <b style={{ fontSize: "2.4rem", lineHeight: 1, color: pct >= 30 ? LEVELS.urgent.color : pct >= 10 ? LEVELS.watch.color : LEVELS.normal.color }}>{pct}%</b>
          <span className="text-lg leading-tight">{t("fieldsBehind")}</span>
        </div>
      ) : <p className="mt-3 text-lg">{t("noPlots")}</p>}

      <div className="grid grid-cols-2 gap-2 mt-3">
        {["urgent", "watch", "normal", "cannot_see"].map((k) => (
          <div key={k} className="card py-2 px-3" style={{ borderColor: LEVELS[k].color }}>
            <b className="text-2xl block leading-none" style={{ color: LEVELS[k].color }}>{c[k]}</b>
            <span className="text-base block mt-1">{t(`off_${k}`)}</span>
          </div>
        ))}
      </div>

      <a className="btn btn-primary w-full mt-3 text-center block" style={{ padding: "14px", fontSize: "1.1rem" }} target="_blank" rel="noopener noreferrer"
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`}>{t("openVillageInMaps")}</a>

      {worst.length > 0 && (
        <>
          <div className="text-lg font-semibold mt-4">{t("plotsToVisit")}</div>
          <div className="flex flex-col gap-2 mt-2">
            {worst.map((p) => (
              <button key={p.id} onClick={() => onOpenPlot(p.id)} className="card p-3 text-left flex items-center gap-3" style={{ minHeight: 52 }}>
                <i style={{ background: LEVELS[p.level].color, width: 16, height: 16, borderRadius: 99, display: "inline-block", flexShrink: 0 }} />
                <b className="text-base" style={{ color: LEVELS[p.level].color }}>{t(`off_${p.level}`)}</b>
                <span className="text-xs ml-auto break-all" style={{ color: "var(--muted)" }}>{p.id}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="card p-3 mt-4">
        <b className="text-base">{t("ownerTitle")}</b>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{t("ownerBody")}</p>
      </div>
      <div className="card p-3 mt-2">
        <b className="text-base">{t("officialName")}</b>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{t("officialNameBody")}</p>
      </div>
    </div>
  );
}
