import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { api } from "@/api";
import { go } from "@/lib/router";
import { useT } from "@/lib/i18n";

const STYLE = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f140c" } }] };
const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);
// How unusual a taluka is for the date: the share flagged now minus the usual share for the same date in other seasons.
const excessColor = (e) => (e == null ? "#8f988a" : e < 0.1 ? "#7bb241" : e < 0.3 ? "#e5a823" : "#d14a30");
const ring = (geom) => (geom.type === "Polygon" ? [geom.coordinates[0]] : geom.coordinates.map((p) => p[0]));
const centroid = (geom) => {
  const pts = ring(geom).flat();
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
};

export default function District() {
  const { t } = useT();
  const [data, setData] = useState(null);
  const [outlines, setOutlines] = useState(null);
  const [reported, setReported] = useState([]);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState(null);
  const [showList, setShowList] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    api("/api/district").then(setData).catch((e) => setErr(e.message));
    api("/api/reported").then(setReported).catch(() => {});
    fetch("/jalna_talukas.json").then((r) => r.json()).then(setOutlines).catch(() => {});
  }, []);

  const byParent = useMemo(() => Object.fromEntries((data?.talukas || []).map((x) => [x.parent_taluka || x.taluka, x])), [data]);

  useEffect(() => {
    if (!data || !outlines) return;
    const feats = outlines.features.map((f) => {
      const row = byParent[f.properties.match];
      return { ...f, properties: { ...f.properties, color: excessColor(row?.excess_over_usual), key: row?.taluka || "", parent: f.properties.match || "" } };
    });
    const fc = { type: "FeatureCollection", features: feats };
    const all = feats.flatMap((f) => ring(f.geometry).flat());
    const bounds = [[Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1]))], [Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))]];
    const map = new maplibregl.Map({ container: box.current, style: STYLE, center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2], zoom: 5.6, pitch: 0, attributionControl: false });
    const markers = [];
    map.on("load", () => {
      map.addSource("t", { type: "geojson", data: fc });
      map.addLayer({ id: "fill", type: "fill", source: "t", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.55 } });
      map.addLayer({ id: "hover", type: "fill", source: "t", filter: ["==", ["get", "parent"], ""], paint: { "fill-color": "#ffffff", "fill-opacity": 0.2 } });
      map.addLayer({ id: "line", type: "line", source: "t", paint: { "line-color": "#e9d8a6", "line-width": 1.4 } });
      feats.forEach((f) => {
        const row = byParent[f.properties.match];
        const el = document.createElement("div");
        el.className = "map-label";
        el.textContent = row ? `${row.rank}. ${f.properties.match}` : f.properties.name;
        markers.push(new maplibregl.Marker({ element: el }).setLngLat(centroid(f.geometry)).addTo(map));
      });
      map.on("mousemove", "fill", (e) => { const p = e.features[0].properties.parent; map.setFilter("hover", ["==", ["get", "parent"], p]); map.getCanvas().style.cursor = "pointer"; setHover(p); });
      map.on("mouseleave", "fill", () => { map.setFilter("hover", ["==", ["get", "parent"], ""]); map.getCanvas().style.cursor = ""; setHover(null); });
      map.on("click", "fill", (e) => { const k = e.features[0].properties.key; if (k) go(`/app/area/${k}`); });
      map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 40, right: 40 }, duration: 2800, pitch: 28, bearing: -8 });
    });
    return () => { markers.forEach((m) => m.remove()); map.remove(); };
  }, [data, outlines, byParent]);

  function download() {
    const head = ["rank", "taluka", "basis", "farmland_cells", "share_flagged", "usual_share_median", "usual_share_max", "excess_over_usual", "cannot_see_share", "as_of"];
    const rows = data.talukas.map((x) => [x.rank, x.parent_taluka || x.taluka, x.kind === "whole_taluka" ? "whole taluka" : "4 km sample box", x.farmland_cells,
      x.share_at_compare_date ?? x.stress_share, x.usual_share_median, x.usual_share_max, x.excess_over_usual, x.cannot_see_share, x.as_of]);
    const csv = [head, ...rows].map((r) => r.map((v) => (v == null ? "" : v)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "jalna_talukas_ranked.csv"; a.click();
  }

  if (err) return <div className="p-8" style={{ color: "var(--rust)" }}>{err}</div>;
  if (!data) return <div className="p-8" style={{ color: "var(--muted)" }}>{t("loading")}</div>;

  const covered = data.talukas.reduce((a, x) => a + (x.farmland_cells || 0), 0);
  const unusual = data.talukas.filter((x) => x.exceeds_every_ordinary_season).length;
  const list = (
    <>
      <h2 className="text-xl font-bold">Jalna district: which taluka needs attention first</h2>
      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{data.note}</p>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        {[[covered.toLocaleString(), "farmland cells"], [`${unusual} of ${data.talukas.length}`, "above any past season"], [reported.length, t("reported")]].map(([n, l]) => (
          <div key={l} className="card py-2"><b className="text-lg">{n}</b><div className="text-[11px]" style={{ color: "var(--muted)" }}>{l}</div></div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn text-sm flex-1" onClick={download}>Download ranking (CSV)</button>
        <button className="btn text-sm flex-1" onClick={() => go("/app/reported")}>{t("reported")} ({reported.length})</button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {data.talukas.map((x) => {
          const parent = x.parent_taluka || x.taluka;
          return (
            <button key={x.taluka} onClick={() => go(`/app/area/${x.taluka}`)} className="card p-3 text-left slide-in" style={{ borderColor: hover === parent ? "var(--leaf)" : undefined }}>
              <div className="flex items-center gap-2 flex-wrap">
                <b className="text-lg">{x.rank}</b><b>{parent}</b>
                <span className="chip" style={{ color: "var(--muted)" }}>{x.kind === "whole_taluka" ? "whole taluka" : "4 km sample"}</span>
                {x.low_confidence && <span className="chip" style={{ color: "var(--ochre)" }}>Low confidence</span>}
                {x.reported > 0 && <span className="chip" style={{ color: "var(--rust)" }}>{x.reported} {t("reported").toLowerCase()}</span>}
              </div>
              <div className="mt-2 text-sm">
                <b style={{ color: excessColor(x.excess_over_usual) }}>{pct(x.share_at_compare_date ?? x.stress_share)}</b> of visible farmland is {t("behindNormal")}
              </div>
              <div className="text-xs mt-1" style={{ color: x.exceeds_every_ordinary_season ? "var(--leaf)" : "var(--muted)" }}>
                {t("usualForDate")}: {pct(x.usual_share_median)} (highest in past seasons {pct(x.usual_share_max)}){x.exceeds_every_ordinary_season ? ` · ${t("higherThanAny")}` : ""}
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "var(--panel-2)" }}>
                <div style={{ width: `${Math.min(100, (x.share_at_compare_date ?? x.stress_share ?? 0) * 100)}%`, height: "100%", background: excessColor(x.excess_over_usual) }} />
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                {t("couldNotSee")} {pct(x.cannot_see_share)} · {(x.farmland_cells || 0).toLocaleString()} cells · {t("asOf")} {x.as_of}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="h-full flex relative">
      <aside className="hidden lg:block w-[400px] shrink-0 border-r overflow-auto scroll-thin p-4" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>{list}</aside>
      <div className="flex-1 relative min-w-0">
        <div className="absolute inset-0"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>
        <button className="btn absolute left-3 top-3 lg:hidden" onClick={() => setShowList(true)}>☰ Ranking</button>
        <div className="absolute left-3 bottom-3 card p-3 text-xs flex gap-3 flex-wrap" style={{ color: "var(--muted)", background: "rgba(24,31,20,.92)" }}>
          {[["#7bb241", "usual"], ["#e5a823", "unusual"], ["#d14a30", "very unusual"], ["#8f988a", "no data"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1"><i style={{ background: c, width: 10, height: 10, borderRadius: 99, display: "inline-block" }} />{l}</span>
          ))}
          <span>colour: how much more is flagged than usual for this date</span>
        </div>
      </div>
      {showList && (
        <div className="absolute inset-0 z-20 lg:hidden flex" style={{ background: "rgba(0,0,0,.5)" }} onClick={() => setShowList(false)}>
          <div className="w-[92%] max-w-[420px] h-full overflow-auto p-4 slide-in" style={{ background: "var(--panel)" }} onClick={(e) => e.stopPropagation()}>{list}</div>
        </div>
      )}
    </div>
  );
}
