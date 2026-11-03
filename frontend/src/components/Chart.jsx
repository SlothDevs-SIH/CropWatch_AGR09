import { doyLabel } from "@/lib/levels";

// Plain SVG line chart: this plot in 2026 against the 2023-2025 average for the same time of year.
export default function Chart({ bins, series, normal }) {
  const W = 380, H = 190, L = 34, R = 10, T = 10, B = 28;
  const x = (i) => L + (i * (W - L - R)) / (bins.length - 1);
  const y = (v) => T + (1 - Math.min(Math.max(v, 0), 0.9) / 0.9) * (H - T - B);
  const path = (arr) => {
    let d = "", pen = false;
    arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    return d;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.3, 0.6, 0.9].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#33402a" />
          <text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#a3ab94">{v.toFixed(1)}</text>
        </g>
      ))}
      {bins.map((b, i) => i % 3 === 0 && (
        <text key={b} x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#a3ab94">{doyLabel(b)}</text>
      ))}
      <path d={path(normal)} fill="none" stroke="#a3ab94" strokeWidth="2" strokeDasharray="5 4" />
      <path d={path(series)} fill="none" stroke="#d14a30" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill="#d14a30" />)}
    </svg>
  );
}
