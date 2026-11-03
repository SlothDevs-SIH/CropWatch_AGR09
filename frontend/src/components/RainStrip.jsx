import { useEffect, useState } from "react";
import { api } from "@/api";
import { doyLabel } from "@/lib/levels";

/** Weekly rainfall this season against the 2018-2025 average. Context for a weak crop, never a cause. */
export default function RainStrip({ taluka }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let on = true;
    api(`/api/rain/${taluka}`).then((r) => on && setD(r)).catch(() => on && setD(false));
    return () => { on = false; };
  }, [taluka]);
  if (d === false) return null;
  if (!d) return <div className="text-xs" style={{ color: "var(--muted)" }}>…</div>;
  const W = 380, H = 84, L = 6, R = 6, T = 6, B = 16, n = d.season_2026_mm.length;
  const max = Math.max(...d.season_2026_mm, ...d.average_2018_2025_mm, 10);
  const bw = (W - L - R) / n, y = (v) => T + (1 - v / max) * (H - T - B);
  const total = d.season_2026_mm.reduce((a, b) => a + b, 0), avg = d.average_2018_2025_mm.reduce((a, b) => a + b, 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly rainfall this season against the average">
        {d.season_2026_mm.map((v, i) => <rect key={i} x={L + i * bw + 1} y={y(v)} width={bw - 2} height={H - B - y(v)} fill="#6aa0b8" opacity=".85" />)}
        <polyline fill="none" stroke="#e9d8a6" strokeWidth="1.6" strokeDasharray="4 3" points={d.average_2018_2025_mm.map((v, i) => `${L + i * bw + bw / 2},${y(v)}`).join(" ")} />
        {[0, 7, 14, 21].map((i) => <text key={i} x={L + i * bw} y={H - 3} fontSize="9" fill="#a3ab94">{doyLabel(d.week_start_doy[i])}</text>)}
      </svg>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        Rain, 1 Jun to now: <b style={{ color: "var(--text)" }}>{Math.round(total)} mm</b> against an average of {Math.round(avg)} mm. Dashed line: average week. Coarse grid, context only.
      </div>
    </div>
  );
}
