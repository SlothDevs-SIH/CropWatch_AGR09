import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { api } from "@/api";
import PlotPanel from "@/components/PlotPanel";
import { LEVELS, STATUS } from "@/lib/levels";

const STYLE = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f140c" } }] };
const COLOR = ["match", ["get", "level"], "urgent", LEVELS.urgent.color, "watch", LEVELS.watch.color, "normal", LEVELS.normal.color,
  "cannot_see", LEVELS.cannot_see.color, LEVELS.not_farmland.color];
const HEIGHT = ["match", ["get", "level"], "urgent", 90, "watch", 55, "normal", 20, "cannot_see", 8, 0];
const ORDER = { urgent: 0, watch: 1, cannot_see: 2, normal: 3 };
const FILTERS = [["flagged", "Visit first"], ["urgent", "Urgent"], ["watch", "Watch"], ["cannot_see", "Cannot see"], ["all", "All farmland"]];

const centreOf = (f) => { const c = f.geometry.coordinates[0]; return [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2]; };
function extent(fs) {
  let w = 180, s = 90, e = -180, n = -90;
  fs.forEach((f) => f.geometry.coordinates[0].forEach(([x, y]) => { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }));
  return [[w, s], [e, n]];
}

export default function TalukaMap({ name, user, onBack }) {
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [plot, setPlot] = useState(null);
  const farmer = user.role === "farmer";
  const [filter, setFilter] = useState(farmer ? "all" : "flagged");
  const box = useRef(null), mapRef = useRef(null), token = useRef(0), overview = useRef(null);

  const loadGeo = useCallback(() => api(`/api/talukas/${name}`).then(setGeo).catch((e) => setErr(e.message)), [name]);
  useEffect(() => { loadGeo(); }, [loadGeo]);

  const farm = useMemo(() => (geo ? geo.features.filter((f) => f.properties.level !== "not_farmland") : []), [geo]);
  const counts = useMemo(() => {
    const c = { urgent: 0, watch: 0, normal: 0, cannot_see: 0 };
    farm.forEach((f) => { c[f.properties.level]++; });
    return c;
  }, [farm]);
  const list = useMemo(() => {
    const ok = (l) => (filter === "all" ? true : filter === "flagged" ? l !== "normal" : l === filter);
    return farm.filter((f) => ok(f.properties.level)).sort((a, b) =>
      ORDER[a.properties.level] - ORDER[b.properties.level] || (a.properties.deviation ?? 0) - (b.properties.deviation ?? 0));
  }, [farm, filter]);

  // ----- map -----
  const fly = useCallback((f) => {
    const map = mapRef.current; if (!map) return;
    const my = ++token.current;
    map.stop();
    map.flyTo({ center: centreOf(f), zoom: 16.2, pitch: 62, bearing: (map.getBearing() + 70) % 360, duration: 3400, curve: 1.9, essential: true });
    map.once("moveend", () => {      // slow orbit once we arrive, unless another move started meanwhile
      if (token.current === my) map.easeTo({ bearing: map.getBearing() + 25, duration: 9000, easing: (t) => t, essential: true });
    });
  }, []);

  const showOverview = useCallback(() => {
    const map = mapRef.current; if (!map || !overview.current) return;
    token.current++;
    map.stop();
    map.flyTo({ ...overview.current, pitch: 45, bearing: -20, duration: 2600, curve: 1.6, essential: true });
  }, []);

  useEffect(() => {
    if (!geo || mapRef.current) return;
    const ext = extent(geo.features);
    const map = new maplibre_map(box.current, ext);
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("cells", { type: "geojson", data: geo, promoteId: "id" });
      map.addLayer({ id: "flat", type: "fill", source: "cells", filter: ["==", ["get", "level"], "not_farmland"], paint: { "fill-color": "#1a2214" } });
      map.addLayer({ id: "cells", type: "fill-extrusion", source: "cells", filter: ["!=", ["get", "level"], "not_farmland"],
        paint: { "fill-extrusion-color": COLOR, "fill-extrusion-height": 0, "fill-extrusion-opacity": 0.92 } });
      map.addLayer({ id: "sel", type: "fill-extrusion", source: "cells", filter: ["==", ["get", "id"], ""],
        paint: { "fill-extrusion-color": "#ffffff", "fill-extrusion-height": 130, "fill-extrusion-opacity": 0.4 } });
      map.on("click", "cells", (e) => { const id = e.features[0].properties.id; pick(id); });
      map.on("mouseenter", "cells", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "cells", () => { map.getCanvas().style.cursor = ""; });
      const cam = map.cameraForBounds(ext, { padding: 60 });
      overview.current = { center: cam.center, zoom: cam.zoom };
      map.flyTo({ ...overview.current, pitch: 45, bearing: -20, duration: 3000, curve: 1.6, essential: true });
      const t0 = performance.now();                       // cells grow up out of the ground
      const step = (t) => {
        const k = Math.min((t - t0) / 1600, 1), e = 1 - Math.pow(1 - k, 3);
        map.setPaintProperty("cells", "fill-extrusion-height", ["*", e, HEIGHT]);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!geo]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getSource("cells")) map.getSource("cells").setData(geo);
  }, [geo]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("sel")) map.setFilter("sel", ["==", ["get", "id"], sel || ""]);
    setTimeout(() => map?.resize(), 50);
  }, [sel]);

  // ----- selection -----
  const pickRef = useRef();
  const pick = (id) => pickRef.current(id);
  pickRef.current = (id) => {
    const f = geo.features.find((x) => x.properties.id === id);
    if (!f) return;
    setSel(id);
    api(`/api/plots/${id}`).then(setPlot).catch((e) => setErr(e.message));
    fly(f);
  };
  const step = (d) => {
    if (!list.length) return;
    const i = list.findIndex((f) => f.properties.id === sel);
    pick(list[(i + d + list.length) % list.length].properties.id);
  };
  const close = () => { setSel(null); setPlot(null); showOverview(); };
  const changed = () => { loadGeo(); if (sel) api(`/api/plots/${sel}`).then(setPlot); };

  if (err && !geo) return <div className="p-8" style={{ color: "#d14a30" }}>{err}</div>;
  if (!geo) return <div className="p-8" style={{ color: "var(--muted)" }}>Loading {name}…</div>;

  const sum = geo.properties, seen = counts.urgent + counts.watch + counts.normal;
  return (
    <div className="h-full flex">
      <aside className="w-[340px] shrink-0 border-r flex flex-col min-h-0" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--line)" }}>
          {onBack && <button className="text-sm mb-2" style={{ color: "var(--muted)" }} onClick={onBack}>← District</button>}
          <h2 className="text-xl font-bold">{name} taluka{farmer && " · your plots"}</h2>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Sample area · as of {sum.as_of} · {farm.length} plot-sized cells</div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            {["urgent", "watch", "normal", "cannot_see"].map((k) => (
              <div key={k} className="card py-2">
                <b className="text-lg" style={{ color: LEVELS[k].color }}>{counts[k]}</b>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{LEVELS[k].label}</div>
              </div>
            ))}
          </div>
          {!farmer && seen > 0 && (
            <div className="text-sm mt-3"><b>{Math.round(((counts.urgent + counts.watch) / seen) * 100)}%</b> of visible farmland is behind normal</div>
          )}
          <div className="flex flex-wrap gap-1 mt-3">
            {FILTERS.filter(([k]) => !farmer || k === "all").map(([k, l]) => (
              <button key={k} className="chip" style={{ background: filter === k ? "var(--accent)" : "transparent", color: filter === k ? "#12170e" : "var(--text)" }} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto scroll-thin p-3 flex flex-col gap-2">
          {list.slice(0, 250).map((f) => {
            const p = f.properties, lv = LEVELS[p.level];
            return (
              <button key={p.id} onClick={() => pick(p.id)} className="card p-2 text-left"
                style={{ borderColor: sel === p.id ? "var(--accent)" : undefined }}>
                <div className="flex items-center gap-2">
                  <i style={{ background: lv.color, width: 10, height: 10, borderRadius: 99, display: "inline-block" }} />
                  <b className="text-sm">{p.id}</b>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{lv.label}{p.deviation != null && ` · ${p.deviation.toFixed(2)}`}</span>
                  {p.status !== "none" && <span className="chip ml-auto">{STATUS[p.status]}</span>}
                </div>
              </button>
            );
          })}
          {list.length === 0 && <div className="text-sm p-2" style={{ color: "var(--muted)" }}>Nothing in this view.</div>}
        </div>
      </aside>
      <div className="flex-1 relative min-w-0">
        <div className="absolute inset-0"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>
        <div className="absolute left-4 bottom-4 card p-3 text-xs flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
          {["urgent", "watch", "normal", "cannot_see"].map((k) => (
            <span key={k} className="flex items-center gap-1"><i style={{ background: LEVELS[k].color, width: 10, height: 10, borderRadius: 99, display: "inline-block" }} />{LEVELS[k].label}</span>
          ))}
          <span>Height = how far behind normal</span>
        </div>
      </div>
      {plot && (
        <aside className="w-[380px] shrink-0 border-l min-h-0" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
          <PlotPanel plot={plot} user={user} onChanged={changed} onPrev={() => step(-1)} onNext={() => step(1)} onClose={close} />
        </aside>
      )}
    </div>
  );
}

function maplibre_map(container, ext) {
  return new maplibregl.Map({ container, style: STYLE, bounds: ext, fitBoundsOptions: { padding: 60 }, zoom: 8, pitch: 0, attributionControl: false });
}
