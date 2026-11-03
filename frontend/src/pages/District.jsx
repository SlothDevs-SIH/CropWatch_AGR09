import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { api } from "@/api";

const STYLE = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f140c" } }] };
const shareColor = (s) => (s == null ? "#8f988a" : s < 0.15 ? "#7bb241" : s < 0.35 ? "#e5a823" : "#d14a30");
const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function District({ onOpen }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState(null);
  const box = useRef(null);

  useEffect(() => { api("/api/district").then(setData).catch((e) => setErr(e.message)); }, []);

  useEffect(() => {
    if (!data) return;
    const ts = data.talukas;
    const cx = ts.reduce((a, t) => a + t.centre[0], 0) / ts.length;
    const cy = ts.reduce((a, t) => a + t.centre[1], 0) / ts.length;
    const map = new maplibregl.Map({ container: box.current, style: STYLE, center: [cx, cy], zoom: 5.4, pitch: 0, attributionControl: false });
    const markers = [];
    map.on("load", () => {
      map.addSource("t", { type: "geojson", data: { type: "FeatureCollection", features: ts.map((t) => ({
        type: "Feature", properties: { name: t.taluka, color: shareColor(t.stress_share) }, geometry: { type: "Point", coordinates: t.centre } })) } });
      map.addLayer({ id: "halo", type: "circle", source: "t", paint: { "circle-radius": 26, "circle-color": ["get", "color"], "circle-opacity": 0.18, "circle-blur": 0.6 } });
      map.addLayer({ id: "dot", type: "circle", source: "t", paint: { "circle-radius": 11, "circle-color": ["get", "color"], "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
      fetch("/maharashtra.json").then((r) => r.json()).then((mh) => {   // Maharashtra districts as context under the taluka dots
        if (!map.getStyle()) return;
        map.addSource("mh", { type: "geojson", data: mh.districts });
        map.addLayer({ id: "mh-fill", type: "fill", source: "mh", paint: { "fill-color": ["case", ["==", ["get", "name"], "Jalna"], "#2b3a1f", "#161d11"], "fill-opacity": 0.95 } }, "halo");
        map.addLayer({ id: "mh-line", type: "line", source: "mh", paint: { "line-color": "#3a4830", "line-width": 0.8 } }, "halo");
      });
      ts.forEach((t) => {
        const el = document.createElement("div");
        el.className = "map-label";
        el.textContent = `${t.rank}. ${t.taluka}`;
        markers.push(new maplibregl.Marker({ element: el, offset: [0, -28] }).setLngLat(t.centre).addTo(map));
      });
      map.on("click", "dot", (e) => onOpen(e.features[0].properties.name));
      map.on("mouseenter", "dot", (e) => { map.getCanvas().style.cursor = "pointer"; setHover(e.features[0].properties.name); });
      map.on("mouseleave", "dot", () => { map.getCanvas().style.cursor = ""; setHover(null); });
      // opening swoop: from a wide view down onto the district, tilted
      map.flyTo({ center: [cx, cy], zoom: 8.6, pitch: 35, bearing: -12, duration: 3200, curve: 1.6, essential: true });
    });
    return () => { markers.forEach((m) => m.remove()); map.remove(); };
  }, [data]);

  if (err) return <div className="p-8" style={{ color: "#d14a30" }}>{err}</div>;
  if (!data) return <div className="p-8" style={{ color: "var(--muted)" }}>Loading district…</div>;

  return (
    <div className="h-full flex">
      <aside className="w-[380px] shrink-0 border-r overflow-auto scroll-thin p-4" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
        <h2 className="text-xl font-bold">Jalna district: which taluka needs attention first</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{data.note}</p>
        <div className="mt-4 flex flex-col gap-3">
          {data.talukas.map((t) => (
            <button key={t.taluka} onClick={() => onOpen(t.taluka)} className="card p-3 text-left slide-in"
              style={{ borderColor: hover === t.taluka ? "var(--accent)" : undefined }}>
              <div className="flex items-center gap-2">
                <b className="text-lg">{t.rank}</b><b>{t.taluka}</b>
                {t.low_confidence && <span className="chip" style={{ color: "#e5a823" }}>Low confidence</span>}
                {t.reported > 0 && <span className="chip" style={{ color: "#d14a30" }}>{t.reported} reported</span>}
              </div>
              <div className="mt-2 text-sm">
                <b style={{ color: shareColor(t.stress_share) }}>{pct(t.stress_share)}</b> of visible farmland is behind normal
                <span style={{ color: "var(--muted)" }}> · Urgent {pct(t.urgent_share)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--panel-2)" }}>
                <div style={{ width: `${(t.urgent_share || 0) * 100}%`, background: "#d14a30" }} />
                <div style={{ width: `${((t.stress_share || 0) - (t.urgent_share || 0)) * 100}%`, background: "#e5a823" }} />
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                Could not see {pct(t.cannot_see_share)} of farmland · {t.visible_cells} cells read · as of {t.as_of}
              </div>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 relative">
        <div className="absolute inset-0"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>
        <div className="absolute left-4 bottom-4 card p-3 text-xs flex gap-3" style={{ color: "var(--muted)" }}>
          {[["#7bb241", "under 15%"], ["#e5a823", "15–35%"], ["#d14a30", "over 35%"], ["#8f988a", "no data"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1"><i style={{ background: c, width: 10, height: 10, borderRadius: 99, display: "inline-block" }} />{l}</span>
          ))}
          <span>share of visible farmland behind normal</span>
        </div>
      </div>
    </div>
  );
}
