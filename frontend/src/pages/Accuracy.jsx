import { useEffect, useState } from "react";

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function Accuracy({ onBack, inApp }) {
  const [a, setA] = useState(null);
  useEffect(() => { fetch("/api/accuracy").then((r) => r.json()).then(setA).catch(() => setA({ measured: false })); }, []);

  const rows = [];
  if (a?.measured) {
    const d = a.detection;
    rows.push(
      ["Farmland flagged in 2026, the test season", pct(a.flagged_in_2026_test_season), `Average of the last five dates; 8 sample areas`],
      ["Farmland flagged in ordinary seasons (false alarms)", pct(a.false_alarm_in_ordinary_seasons?.value), `${a.false_alarm_in_ordinary_seasons?.n_taluka_seasons} taluka-seasons, 2019 to 2025`],
      ["Plain 'less green than last reading' rule, same false-alarm rate", `${pct(a.simple_baseline?.flagged_in_2026_test_season)} in 2026`, "It flags 2026 less than ordinary seasons, so it cannot see this drought"],
      ["Sample areas where the signal appeared by the order date", `${d.talukas_with_detection} of ${d.talukas_total}`, `Days before the 25 September order: ${d.days_before_order.map((x) => (x > 0 ? `+${x}` : x)).join(", ") || "none"}. Negative means after`],
    );
  }
  const open = [
    ["Agreement with farmer or field observations", "Not collected yet. Target 20 to 30 dated plots with photos"],
    ["Taluka-by-taluka match with the official drought list", "List not obtained yet"],
  ];

  return (
    <div className="min-h-full p-6 overflow-auto">
      <div className="max-w-3xl mx-auto fade-up">
        {!inApp && <button className="text-sm mb-4" style={{ color: "var(--muted)" }} onClick={onBack}>← Back</button>}
        <h1 className="text-3xl font-bold">What we have measured</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          Nothing here is invented. Every number comes from a file in our repository and shows how many cases it rests on. What we have not measured is listed as not measured.
        </p>

        {a && !a.measured && <div className="card mt-6 p-4">The backtest has not been run yet, so nothing is measured.</div>}
        {rows.length > 0 && (
          <div className="card mt-6 overflow-hidden">
            {rows.map(([x, y, z]) => (
              <div key={x} className="grid sm:grid-cols-[2fr_1fr_1.6fr] gap-2 px-4 py-3 border-b text-sm" style={{ borderColor: "var(--line)" }}>
                <div>{x}</div><b style={{ color: "var(--leaf)" }}>{y}</b><span style={{ color: "var(--muted)" }}>{z}</span>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold mt-8">Not measured yet</h2>
        <div className="card mt-3 overflow-hidden">
          {open.map(([x, z]) => (
            <div key={x} className="grid sm:grid-cols-[2fr_1fr_1.6fr] gap-2 px-4 py-3 border-b text-sm" style={{ borderColor: "var(--line)" }}>
              <div>{x}</div><b style={{ color: "var(--ochre)" }}>To be determined</b><span style={{ color: "var(--muted)" }}>{z}</span>
            </div>
          ))}
        </div>

        <div className="card mt-6 p-5">
          <b>What this shows</b>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            In five of eight sample areas the 2026 season was flagged far more than any ordinary season, and a simple greenness rule could not tell 2026 apart.
            Rainfall for June to October 2026 was about half the 2018 to 2025 average, which agrees with reports of a deficit near 46% in Jalna.
          </p>
          <b className="block mt-4">What it does not show</b>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            It does not show an early warning of weeks: the signal appears around the order date, a little earlier in two areas and later in others.
            It is not checked against the ground. Each taluka is one 4 km sample area, and a "plot" is a 200 m cell, not a legal survey plot.
            The alert settings were chosen on seasons other than 2026, but on the same places they are then tested on.
          </p>
        </div>
      </div>
    </div>
  );
}
