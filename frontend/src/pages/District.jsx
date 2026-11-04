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

  const seriousBand = (e) => (e == null ? "dist_watch" : e < 0.1 ? "dist_fine" : e < 0.3 ? "dist_watch" : "dist_serious");
  const list = (
    <>
      <h2 className="text-2xl font-bold">{t("district")}: Jalna</h2>
      <p className="text-base mt-1" style={{ color: "var(--muted)" }}>Talukas that need help first are at the top.</p>
      <button className="btn w-full mt-3 text-lg" style={{ padding: "14px" }} onClick={() => go("/app/reported")}>{t("reported")} ({reported.length})</button>
      <div className="mt-4 flex flex-col gap-3">
        {data.talukas.map((x) => {
          const parent = x.parent_taluka || x.taluka, share = x.share_at_compare_date ?? x.stress_share ?? 0, col = excessColor(x.excess_over_usual);
          return (
            <button key={x.taluka} onClick={() => go(`/app/area/${x.taluka}`)} className="card p-4 text-left slide-in" style={{ borderColor: hover === parent ? "var(--leaf)" : col, borderWidth: hover === parent ? 3 : 2 }}>
              <div className="flex items-center gap-3">
                <b className="text-3xl" style={{ color: col, minWidth: 28 }}>{x.rank}</b>
                <b className="text-xl">{parent}</b>
                <span className="chip ml-auto text-base" style={{ color: col, borderColor: col }}>{t(seriousBand(x.excess_over_usual))}</span>
              </div>
              <div className="mt-3 text-lg"><b style={{ color: col }}>{pct(share)}</b> {t("fieldsBehind")}</div>
              <div className="mt-2 h-3 rounded-full overflow-hidden" style={{ background: "var(--panel-2)" }}>
                <div style={{ width: `${Math.min(100, share * 100)}%`, height: "100%", background: col }} />
              </div>
              {x.reported > 0 && <div className="mt-2 text-base" style={{ color: "var(--rust)" }}>{x.reported} {t("reported").toLowerCase()}</div>}
            </button>
          );
        })}
      </div>
      <button className="text-sm underline mt-5" style={{ color: "var(--muted)" }} onClick={download}>Download the ranking (CSV)</button>
    </>
  );

  return (
    <div className="h-full flex relative">
      <aside className="hidden lg:block w-[420px] shrink-0 border-r overflow-auto scroll-thin p-4" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>{list}</aside>
      <div className="flex-1 relative min-w-0">
        <div className="absolute inset-0"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>
        <button className="btn absolute left-3 top-3 lg:hidden" onClick={() => setShowList(true)}>☰ Ranking</button>
        <div className="absolute left-3 bottom-3 card p-3 text-xs flex gap-3 flex-wrap" style={{ color: "var(--muted)", background: "rgba(24,31,20,.92)" }}>
          {[["#7bb241", "dist_fine"], ["#e5a823", "dist_watch"], ["#d14a30", "dist_serious"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1 text-sm"><i style={{ background: c, width: 12, height: 12, borderRadius: 99, display: "inline-block" }} />{t(l)}</span>
          ))}
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
