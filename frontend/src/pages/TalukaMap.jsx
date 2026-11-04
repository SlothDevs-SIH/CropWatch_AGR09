import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { api } from "@/api";
import PlotPanel from "@/components/PlotPanel";
import { LEVELS } from "@/lib/levels";
import { BIN_COUNT, DEFAULT_TH, ORDER_BIN, binDate, levelAt } from "@/lib/replay";
import { useT } from "@/lib/i18n";

const STYLE = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f140c" } }] };
const LVL = ["coalesce", ["feature-state", "lvl"], ["get", "level"]];          // replay level if set, else the live level
const COLOR = ["match", LVL, "urgent", LEVELS.urgent.color, "watch", LEVELS.watch.color, "normal", LEVELS.normal.color, "cannot_see", LEVELS.cannot_see.color, LEVELS.not_farmland.color];
const HEIGHT = ["match", LVL, "urgent", 45, "watch", 28, "normal", 10, "cannot_see", 4, 0];   // low blocks, so the satellite picture under them stays visible
const ORDER = { urgent: 0, watch: 1, cannot_see: 2, normal: 3 };
const FIRST_REPLAY_BIN = 5;
const FILTERS = ["flagged", "urgent", "watch", "cannot_see", "all"];

const centreOf = (f) => { const c = f.geometry.coordinates[0]; return [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2]; };
function extent(fs) {
  let w = 180, s = 90, e = -180, n = -90;
  fs.forEach((f) => f.geometry.coordinates[0].forEach(([x, y]) => { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }));
  return [[w, s], [e, n]];
}

export default function TalukaMap({ name, user, onBack, focus }) {
  const { t } = useT();
  const farmer = user.role === "farmer";
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [plot, setPlot] = useState(null);
  const [filter, setFilter] = useState(farmer ? "all" : "flagged");
  const [showList, setShowList] = useState(false);
  const [more, setMore] = useState(false);
  const [base, setBase] = useState(true);                      // satellite picture under the squares
  const [pic, setPic] = useState(null);
  const [bin, setBin] = useState(null);                         // null = live; otherwise the replayed 10-day bin
  const [replayCounts, setReplayCounts] = useState(null);
  const [series, setSeries] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [th, setTh] = useState(DEFAULT_TH);
  const box = useRef(null), mapRef = useRef(null), token = useRef(0), overview = useRef(null), replayed = useRef(new Map());

  const loadGeo = useCallback(() => api(`/api/talukas/${name}`).then(setGeo).catch((e) => setErr(e.message)), [name]);
  useEffect(() => { loadGeo(); }, [loadGeo]);
  useEffect(() => {
    api(`/api/imagery/${name}`).then((m) => {
      const f = m.frames?.now, b = m.bbox;
      if (f && b) setPic({ url: `/imagery/${m.area || name}/${f.file}`, coords: [[b[0], b[3]], [b[2], b[3]], [b[2], b[1]], [b[0], b[1]]] });
    }).catch(() => {});
  }, [name]);
  useEffect(() => { fetch("/api/accuracy").then((r) => r.json()).then((a) => a.thresholds && setTh(a.thresholds)).catch(() => {}); }, []);

  const farm = useMemo(() => (geo ? geo.features.filter((f) => f.properties.level !== "not_farmland") : []), [geo]);
  const counts = useMemo(() => {
    const c = { urgent: 0, watch: 0, normal: 0, cannot_see: 0 };
    farm.forEach((f) => { c[f.properties.level]++; });
    return c;
  }, [farm]);
  const shown = replayCounts || counts;
  const seen = shown.urgent + shown.watch + shown.normal;
  const list = useMemo(() => {
    const ok = (l) => (filter === "all" ? true : filter === "flagged" ? l !== "normal" : l === filter);
    return farm.filter((f) => ok(f.properties.level)).sort((a, b) =>
      ORDER[a.properties.level] - ORDER[b.properties.level] || (a.properties.deviation ?? 0) - (b.properties.deviation ?? 0));
  }, [farm, filter]);

  // ----- camera -----
  const fly = useCallback((f) => {
    const map = mapRef.current; if (!map) return;
    const my = ++token.current;
    map.stop();
    map.flyTo({ center: centreOf(f), zoom: 16, pitch: 62, bearing: (map.getBearing() + 70) % 360, duration: 3200, curve: 1.9, essential: true });
    map.once("moveend", () => { if (token.current === my) map.easeTo({ bearing: map.getBearing() + 25, duration: 9000, easing: (x) => x, essential: true }); });
  }, []);
  const showOverview = useCallback(() => {
    const map = mapRef.current; if (!map || !overview.current) return;
    token.current++; map.stop();
    map.flyTo({ ...overview.current, pitch: 45, bearing: -20, duration: 2600, curve: 1.6, essential: true });
  }, []);

  // ----- map -----
  useEffect(() => {
    if (!geo || mapRef.current) return;
    const bb = geo.properties.bbox;
    const ext = farmer ? extent(geo.features) : [[bb[0], bb[1]], [bb[2], bb[3]]];
    const map = new maplibregl.Map({ container: box.current, style: STYLE, bounds: ext, fitBoundsOptions: { padding: 40 }, zoom: 8, attributionControl: false });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("cells", { type: "geojson", data: geo, promoteId: "id" });
      map.addLayer({ id: "flat", type: "fill", source: "cells", filter: ["==", ["get", "level"], "not_farmland"], paint: { "fill-color": "#1a2214" } });
      map.addLayer({ id: "cells", type: "fill-extrusion", source: "cells", filter: ["!=", ["get", "level"], "not_farmland"],
        paint: { "fill-extrusion-color": COLOR, "fill-extrusion-height": 0, "fill-extrusion-opacity": 0.78 } });
      map.addLayer({ id: "cell-lines", type: "line", source: "cells", filter: ["!=", ["get", "level"], "not_farmland"],
        paint: { "line-color": "#ffffff", "line-opacity": 0.45, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.2, 15, 1.2] } });
      map.addLayer({ id: "sel", type: "fill-extrusion", source: "cells", filter: ["==", ["get", "id"], ""],
        paint: { "fill-extrusion-color": "#ffffff", "fill-extrusion-height": 60, "fill-extrusion-opacity": 0.45 } });
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
      map.on("click", "cells", (e) => pickRef.current(e.features[0].properties.id));
      map.on("mouseenter", "cells", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "cells", () => { map.getCanvas().style.cursor = ""; });
      const cam = map.cameraForBounds(ext, { padding: 40 });
      overview.current = { center: cam.center, zoom: cam.zoom };
      map.flyTo({ ...overview.current, pitch: 45, bearing: -20, duration: 3000, curve: 1.6, essential: true });
      const t0 = performance.now();                                           // cells grow up out of the ground
      const step = (now) => {
        const k = Math.min((now - t0) / 1600, 1), e = 1 - Math.pow(1 - k, 3);
        map.setPaintProperty("cells", "fill-extrusion-height", ["*", e, HEIGHT]);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!geo]);
  useEffect(() => { const m = mapRef.current; if (m?.getSource("cells")) m.getSource("cells").setData(geo); }, [geo]);
  useEffect(() => {                                                                  // the satellite picture goes under everything else
    const m = mapRef.current;
    if (!m || !pic) return;
    const add = () => {
      if (!m.getSource("pic")) {
        m.addSource("pic", { type: "image", url: pic.url, coordinates: pic.coords });
        m.addLayer({ id: "pic", type: "raster", source: "pic" }, "flat");
      }
      m.setLayoutProperty("pic", "visibility", base ? "visible" : "none");
      m.setPaintProperty("flat", "fill-opacity", base ? 0 : 1);
    };
    if (m.getLayer("flat")) add(); else m.once("load", add);
  }, [pic, base, geo]);
  useEffect(() => {
    const m = mapRef.current;
    if (m?.getLayer("sel")) m.setFilter("sel", ["==", ["get", "id"], sel || ""]);
    setTimeout(() => m?.resize(), 60);
  }, [sel, showList]);

  // ----- season replay -----
  const applyBin = useCallback((b) => {
    const m = mapRef.current;
    if (!m?.getSource("cells")) return;
    if (b == null) { m.removeFeatureState({ source: "cells" }); replayed.current.clear(); setReplayCounts(null); return; }
    if (!series) return;
    const c = { urgent: 0, watch: 0, normal: 0, cannot_see: 0 };
    series.ids.forEach((id, i) => {
      const lvl = levelAt(series.now[i], series.normal[i], b, th);
      c[lvl]++;
      if (replayed.current.get(id) !== lvl) { m.setFeatureState({ source: "cells", id }, { lvl }); replayed.current.set(id, lvl); }
    });
    setReplayCounts(c);
  }, [series, th]);
  useEffect(() => { applyBin(bin); }, [bin, applyBin]);

  async function startReplay() {
    if (!series && !loadingSeries) {
      setLoadingSeries(true);
      try { setSeries(await api(`/api/talukas/${name}/series`)); } catch (e) { setErr(e.message); } finally { setLoadingSeries(false); }
    }
    setBin((b) => (b == null ? FIRST_REPLAY_BIN : b));
  }
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setBin((b) => { if (b == null || b >= BIN_COUNT - 1) { setPlaying(false); return BIN_COUNT - 1; } return b + 1; }), 900);
    return () => clearInterval(id);
  }, [playing]);

  // ----- selection -----
  const pickRef = useRef();
  pickRef.current = (id) => {
    const f = geo.features.find((x) => x.properties.id === id);
    if (!f) return;
    setSel(id); setShowList(false);
    api(`/api/plots/${id}`).then(setPlot).catch((e) => setErr(e.message));
    fly(f);
  };
  const pick = (id) => pickRef.current(id);
  const focused = useRef(false);
  useEffect(() => {                                        // opened from a link to one plot (for example the reported list)
    if (geo && focus && !focused.current) { focused.current = true; setTimeout(() => pickRef.current(focus), 3300); }
  }, [geo, focus]);
  const step = (d) => {
    if (!list.length) return;
    const i = list.findIndex((f) => f.properties.id === sel);
    pick(list[(i + d + list.length) % list.length].properties.id);
  };
  const close = () => { setSel(null); setPlot(null); showOverview(); };
  const changed = () => { loadGeo(); if (sel) api(`/api/plots/${sel}`).then(setPlot); };

  if (err && !geo) return <div className="p-8" style={{ color: "var(--rust)" }}>{err}</div>;
  if (!geo) return <div className="p-8" style={{ color: "var(--muted)" }}>{t("loading")}</div>;

  const sum = geo.properties, whole = sum.kind === "whole_taluka";
  const pctBehind = seen ? Math.round(((shown.urgent + shown.watch) / seen) * 100) : null;
  const sliderBin = bin ?? BIN_COUNT - 1;

  const word = (k) => (farmer ? t(k) : t(`off_${k}`));
  const shownList = list.slice(0, more ? 250 : 30);
  const listTitle = filter === "flagged" ? t("visitFirst") : filter === "all" ? t("allFarmland") : word(filter);

  const listPane = (
    <>
      <div className="p-4 border-b" style={{ borderColor: "var(--line)" }}>
        {onBack && <button className="btn mb-3 text-base" style={{ padding: "8px 14px" }} onClick={onBack}>← {t("district")}</button>}
        <h2 className="text-2xl font-bold">{sum.parent_taluka || name}</h2>
        {!farmer && pctBehind != null && (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <b style={{ fontSize: "2.6rem", lineHeight: 1, color: pctBehind >= 30 ? LEVELS.urgent.color : pctBehind >= 10 ? LEVELS.watch.color : LEVELS.normal.color }}>{pctBehind}%</b>
              <span className="text-lg leading-tight">{t("fieldsBehind")}</span>
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{t("updated")} {sum.as_of}{bin != null ? ` · ${binDate(bin, true)}` : ""}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {["urgent", "watch", "normal", "cannot_see"].map((k) => (
            <button key={k} onClick={() => { setFilter(filter === k ? "flagged" : k); setMore(false); }} className="card py-3 px-3 text-left"
              style={{ borderColor: filter === k ? "var(--leaf)" : LEVELS[k].color, borderWidth: filter === k ? 3 : 1 }}>
              <b className="text-2xl block leading-none" style={{ color: LEVELS[k].color }}>{shown[k].toLocaleString()}</b>
              <span className="text-base block mt-1">{word(k)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 text-lg font-semibold">{listTitle}</div>
      <div className="flex-1 overflow-auto scroll-thin p-3 flex flex-col gap-2">
        {shownList.map((f) => {
          const p = f.properties, lv = LEVELS[p.level], sk = p.status === "reported" ? "status_reported" : p.status;
          return (
            <button key={p.id} onClick={() => pick(p.id)} className="card p-3 text-left" style={{ borderColor: sel === p.id ? "var(--leaf)" : undefined, borderWidth: sel === p.id ? 3 : 1, minHeight: 56 }}>
              <div className="flex items-center gap-3">
                <i style={{ background: lv.color, width: 16, height: 16, borderRadius: 99, display: "inline-block", flexShrink: 0 }} />
                <div className="min-w-0">
                  <b className="text-lg block leading-tight" style={{ color: lv.color }}>{word(p.level)}</b>
                  <span className="text-sm block break-all" style={{ color: "var(--muted)" }}>{p.id}</span>
                </div>
                {p.status !== "none" && <span className="chip ml-auto text-sm text-center">{t(sk)}</span>}
              </div>
            </button>
          );
        })}
        {list.length === 0 && <div className="text-base p-2" style={{ color: "var(--muted)" }}>{t("noPlots")}</div>}
        {!more && list.length > 30 && <button className="btn text-base" style={{ padding: "12px" }} onClick={() => setMore(true)}>{t("showMore")} ({list.length - 30})</button>}
      </div>
    </>
  );

  return (
    <div className="h-full flex relative">
      <aside className="hidden lg:flex w-[360px] shrink-0 border-r flex-col min-h-0" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>{listPane}</aside>

      <div className="flex-1 relative min-w-0">
        <div className="absolute inset-0"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>

        <button className="btn absolute left-3 top-3 lg:hidden" onClick={() => setShowList(true)}>☰ {t("visitFirst")}</button>

        {!farmer && (
          <div className="absolute left-3 right-3 bottom-3 card p-3" style={{ background: "rgba(24,31,20,.92)", backdropFilter: "blur(6px)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              {bin == null ? (
                <button className="btn btn-primary text-sm" onClick={() => { startReplay().then(() => setPlaying(true)); }}>▶ {t("replay")}</button>
              ) : (
                <>
                  <button className="btn text-sm" onClick={() => setPlaying((p) => !p)}>{playing ? "❚❚" : "▶"}</button>
                  <button className="btn text-sm" onClick={() => { setPlaying(false); setBin(null); }}>Live</button>
                </>
              )}
              {loadingSeries && <span className="text-xs" style={{ color: "var(--muted)" }}>{t("loading")}</span>}
              {bin != null && <b className="text-sm ml-1">{binDate(bin, true)}</b>}
              <span className="text-xs ml-auto hidden sm:inline" style={{ color: "var(--muted)" }}>{t("season")}: Jun → Oct</span>
            </div>
            {bin != null && (
              <div className="mt-2 relative">
                <input type="range" className="w-full" min={FIRST_REPLAY_BIN} max={BIN_COUNT - 1} step={1} value={sliderBin} aria-label={t("replay")}
                  onChange={(e) => { setPlaying(false); setBin(Number(e.target.value)); }} />
                <div className="relative h-4 text-[10px]" style={{ color: "var(--ochre)" }}>
                  <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((ORDER_BIN - FIRST_REPLAY_BIN) / (BIN_COUNT - 1 - FIRST_REPLAY_BIN)) * 100}%` }}>▲ {t("orderDate")}</span>
                </div>
              </div>
            )}
          </div>
        )}
        {pic && <button className="btn absolute right-3 bottom-28 text-sm" onClick={() => setBase((b) => !b)}>{base ? t("hidePicture") : t("showPicture")}</button>}
        <div className="absolute left-3 top-14 lg:top-3 lg:left-auto lg:right-3 card px-3 py-2 text-xs hidden sm:flex gap-3" style={{ color: "var(--muted)" }}>
          {["urgent", "watch", "normal", "cannot_see"].map((k) => (
            <span key={k} className="flex items-center gap-1 text-sm"><i style={{ background: LEVELS[k].color, width: 12, height: 12, borderRadius: 99, display: "inline-block" }} />{word(k)}</span>
          ))}
        </div>
      </div>

      {showList && (
        <div className="absolute inset-0 z-20 lg:hidden flex" style={{ background: "rgba(0,0,0,.5)" }} onClick={() => setShowList(false)}>
          <div className="w-[88%] max-w-[360px] h-full flex flex-col slide-in" style={{ background: "var(--panel)" }} onClick={(e) => e.stopPropagation()}>{listPane}</div>
        </div>
      )}

      {plot && (
        <aside className="absolute z-10 inset-x-0 bottom-0 h-[72%] border-t rounded-t-2xl lg:static lg:inset-auto lg:h-auto lg:w-[380px] lg:shrink-0 lg:border-t-0 lg:border-l lg:rounded-none min-h-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
          <PlotPanel plot={plot} user={user} onChanged={changed} onPrev={() => step(-1)} onNext={() => step(1)} onClose={close} />
        </aside>
      )}
    </div>
  );
}
