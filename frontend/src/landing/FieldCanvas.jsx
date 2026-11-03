import { useEffect, useRef } from "react";
import { reduced } from "./motion";

const COLS = 46, ROWS = 28, SEASON = 20;           // seconds for one June-to-October loop
const GREEN = [112, 164, 60], DEEP = [58, 98, 46], OCHRE = [229, 168, 35], RUST = [209, 74, 48], SAGE = [143, 152, 138];
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hash = (a, b) => rnd(a * 57 + b * 131);
const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return hash(xi, yi) * (1 - u) * (1 - v) + hash(xi + 1, yi) * u * (1 - v) + hash(xi, yi + 1) * (1 - u) * v + hash(xi + 1, yi + 1) * u * v;
};
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct"];

/**
 * An illustration of one season over a field seen from above: crop rows sway, a satellite pass scans across,
 * drought stress spreads from a few patches, and drifting clouds hide plots ("cannot see"). Not real data.
 * onStats receives { behind, cloud, label } about four times a second.
 */
export default function FieldCanvas({ onStats, still = false }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    const centres = [[0.24, 0.34], [0.72, 0.66], [0.52, 0.16]];
    const cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const d = Math.min(...centres.map(([cx, cy]) => Math.hypot(x / COLS - cx, (y / ROWS - cy) * 0.6)));
      cells.push({ x, y, tone: noise(x * 0.18, y * 0.18) * 0.7 + rnd(x * 9 + y) * 0.3, onset: Math.min(2.4, d * 3.9 + noise(x * 0.3 + 9, y * 0.3) * 0.45) });
    }
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, last = 0, statT = 0;

    const size = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t, fixedS) => {
      const ph = (t % SEASON) / SEASON;
      const s = fixedS ?? ph * 1.25;
      const fade = fixedS != null ? 1 : Math.min(1, ph / 0.05, (1 - ph) / 0.07);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      const cw = W / COLS, ch = H / ROWS, gap = Math.max(1.2, cw * 0.09);
      const beam = ((t * 8) % (COLS + 16)) - 5;
      let behind = 0, cloud = 0;
      for (const c of cells) {
        const wave = 0.5 + 0.5 * Math.sin(t * 1.3 + c.x * 0.33 + c.y * 0.21);
        let col = mix(DEEP, GREEN, Math.min(1, c.tone * 0.9 + wave * 0.18));
        const dev = Math.max(0, Math.min(1, (s - c.onset * 0.9) * 2.2));
        if (dev > 0) col = dev < 0.5 ? mix(col, OCHRE, dev / 0.5) : mix(OCHRE, RUST, (dev - 0.5) / 0.5);
        if (dev > 0.3) behind++;
        const cl = noise(c.x * 0.13 + t * 0.16, c.y * 0.16 - t * 0.05);
        const hidden = cl > 0.66;
        if (hidden) { col = mix(col, SAGE, Math.min(1, (cl - 0.66) * 7)); cloud++; }
        const lit = Math.max(0, 1 - (beam - c.x) / 7) * (c.x <= beam ? 1 : 0);
        const k = 1 + lit * 0.55;
        ctx.fillStyle = `rgb(${Math.min(255, col[0] * k)|0},${Math.min(255, col[1] * k)|0},${Math.min(255, col[2] * k)|0})`;
        const px = c.x * cw + gap / 2, py = c.y * ch + gap / 2, w = cw - gap, h = ch - gap;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, w, h, Math.min(3, w * 0.2)); else ctx.rect(px, py, w, h);
        ctx.fill();
        if (!hidden && cw > 13) {                          // crop rows
          ctx.fillStyle = "rgba(0,0,0,.2)";
          ctx.fillRect(px + w * 0.34, py + 2, 1, h - 4); ctx.fillRect(px + w * 0.67, py + 2, 1, h - 4);
        }
      }
      if (fixedS == null) {                                 // satellite scan beam
        const bx = beam * cw, g = ctx.createLinearGradient(bx - cw * 9, 0, bx, 0);
        g.addColorStop(0, "rgba(233,216,166,0)"); g.addColorStop(1, "rgba(233,216,166,.28)");
        ctx.fillStyle = g; ctx.fillRect(bx - cw * 9, 0, cw * 9, H);
        ctx.fillStyle = "rgba(255,244,205,.9)"; ctx.fillRect(bx - 1, 0, 2, H);
      }
      ctx.globalAlpha = 1;
      if (onStats && t - statT > 0.25) {
        statT = t;
        const day = Math.min(152, Math.round(s * 150 / 1.25));
        const d = new Date(Date.UTC(2026, 5, 1) + day * 86400000);
        onStats({ behind: Math.round((behind / cells.length) * 100), cloud: Math.round((cloud / cells.length) * 100), label: `${d.getUTCDate()} ${MONTHS[Math.max(0, d.getUTCMonth() - 5)] || "Oct"}` });
      }
    };

    size();
    const frozen = typeof still === "number" ? still : 0.7;   // "still" may carry how far into the season to freeze
    const ro = new ResizeObserver(() => { size(); if (still || reduced()) draw(0, frozen); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    if (still || reduced()) { draw(0, frozen); return () => { ro.disconnect(); io.disconnect(); }; }
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 30) return;       // about 33 fps is plenty and keeps laptops cool
      last = now; draw(now / 1000, null);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [onStats, still]);
  return <canvas ref={ref} className="lp-field-canvas" aria-hidden="true" />;
}
