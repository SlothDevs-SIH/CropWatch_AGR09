import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

const SIZE = 480;                       // canvas pixels; shown responsively
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const dayMonth = (iso) => { const d = new Date(iso + "T00:00:00Z"); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const range = (dates) => (dates?.length ? (dates.length === 1 ? dayMonth(dates[0]) : `${dayMonth(dates[0])} to ${dayMonth(dates[dates.length - 1])}`) : "");

/**
 * Before and after, same place: a plain swipe slider over pre-rendered satellite pictures.
 * Default is "Compare years" (a typical ordinary year against 2026, same time of year), which removes ordinary ripening from the comparison.
 */
export default function PictureCompare({ plot }) {
  const [meta, setMeta] = useState(undefined);        // undefined = loading, null = not rendered
  const [imgs, setImgs] = useState({});
  const [mode, setMode] = useState("years");
  const [pos, setPos] = useState(50);
  const left = useRef(), right = useRef(), box = useRef();

  useEffect(() => {
    let on = true;
    setMeta(undefined);
    api(`/api/imagery/${plot.area}`).then((m) => on && setMeta(m)).catch(() => on && setMeta(null));
    return () => { on = false; };
  }, [plot.area]);

  useEffect(() => {
    if (!meta) return;
    let on = true;
    Promise.all(Object.entries(meta.frames).map(async ([k, f]) => [k, await load(`/imagery/${meta.area}/${f.file}`)]))
      .then((arr) => on && setImgs(Object.fromEntries(arr)));
    return () => { on = false; };
  }, [meta]);

  const hasDates = !!(meta && meta.frames.aug && meta.frames.late);
  const pair = mode === "years" ? ["normal", "now"] : ["aug", "late"];

  useEffect(() => {
    if (!meta || !plot.centre) return;
    const [lon, lat] = plot.centre, [w, s, e, n] = meta.bbox;
    const span = Math.max(6 * plot.cell_m, 1200);                      // metres shown across the picture
    const win = span / meta.px_m;                                      // the same, in source pixels
    const cx = ((lon - w) / (e - w)) * meta.width, cy = ((n - lat) / (n - s)) * meta.height;
    pair.forEach((k, i) => {
      const c = (i === 0 ? left : right).current;
      if (!c) return;
      const g = c.getContext("2d");
      g.fillStyle = "#505050"; g.fillRect(0, 0, SIZE, SIZE);
      if (imgs[k]) { g.imageSmoothingEnabled = true; g.drawImage(imgs[k], cx - win / 2, cy - win / 2, win, win, 0, 0, SIZE, SIZE); }
      const cell = (plot.cell_m / span) * SIZE;                        // the plot's own square
      g.strokeStyle = "#ffffff"; g.lineWidth = 2.5; g.strokeRect(SIZE / 2 - cell / 2, SIZE / 2 - cell / 2, cell, cell);
    });
  }, [meta, imgs, mode, plot.id, plot.centre, plot.cell_m]);                // eslint-disable-line react-hooks/exhaustive-deps

  if (meta === undefined) return null;
  if (meta === null) return <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>Satellite pictures for this area have not been rendered yet.</div>;

  const [L, R] = pair;
  const fl = meta.frames[L], fr = meta.frames[R];
  const labelL = mode === "years" ? `A typical year (${fl?.year}), ${range(fl?.dates)}` : `2026, ${range(fl?.dates)}`;
  const labelR = `2026, ${range(fr?.dates)}`;
  const move = (e) => {
    if (e.buttons !== 1 && e.pointerType === "mouse") return;
    const r = box.current.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100))));
  };

  return (
    <div className="card p-3 mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <b className="text-sm">Before and after</b>
        <div className="ml-auto flex gap-1" role="group" aria-label="What to compare">
          <button className="chip" aria-pressed={mode === "years"} onClick={() => setMode("years")}
            style={{ background: mode === "years" ? "var(--leaf)" : "transparent", color: mode === "years" ? "#12170e" : "var(--text)" }}>Compare years</button>
          {hasDates && <button className="chip" aria-pressed={mode === "dates"} onClick={() => setMode("dates")}
            style={{ background: mode === "dates" ? "var(--leaf)" : "transparent", color: mode === "dates" ? "#12170e" : "var(--text)" }}>Compare dates</button>}
        </div>
      </div>

      <div ref={box} className="relative mt-2 rounded-lg overflow-hidden select-none" style={{ touchAction: "pan-y", cursor: "ew-resize", border: "1px solid var(--line)" }}
        onPointerDown={move} onPointerMove={move}>
        <canvas ref={left} width={SIZE} height={SIZE} style={{ width: "100%", aspectRatio: "1 / 1", display: "block" }} />
        <canvas ref={right} width={SIZE} height={SIZE} style={{ width: "100%", aspectRatio: "1 / 1", display: "block", position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${pos}%)` }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,.4)" }} />
        <div style={{ position: "absolute", left: `${pos}%`, top: "50%", width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 99, background: "#fff", color: "#12170e", display: "grid", placeItems: "center", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,.5)" }} aria-hidden="true">↔</div>
        <span className="absolute left-2 top-2 text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,.92)", color: "#2c2c2a", maxWidth: "45%" }}>{labelL}</span>
        <span className="absolute right-2 top-2 text-[11px] px-2 py-0.5 rounded text-right" style={{ background: "rgba(255,255,255,.92)", color: "#2c2c2a", maxWidth: "45%" }}>{labelR}</span>
      </div>
      <input type="range" min={0} max={100} step={1} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="w-full mt-2" aria-label="Slide between the two pictures" />

      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        {mode === "years"
          ? "Same place and time of year. The left picture is an ordinary, not a dry, year, so what differs is the season, not the calendar."
          : "Both pictures are 2026. Fields also turn brown from ordinary ripening and harvest, so this alone can mislead. Prefer Compare years."}
        {" "}White square: this plot. Each picture blends the clearest passes near its date ({fl?.clear_pct}% and {fr?.clear_pct}% clear; grey = never clear).
        Cloud, harvest or ploughing can also change colour: this shows a pattern, not a cause.
      </div>
    </div>
  );
}
