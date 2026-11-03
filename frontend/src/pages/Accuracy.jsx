const ROWS = [
  ["Alerts confirmed by farmer or field visit", "To be determined", "Needs 20–30 dated field observations"],
  ["Real problems we missed", "To be determined", "Same field observations"],
  ["Days of warning before the official drought order (25 Sep 2026)", "To be determined", "Known-event check, village by village"],
  ["Us versus the simple 'greener or less green than last week' rule", "To be determined", "Baseline not run yet"],
  ["Share of farmland we could not see (latest week)", "Shown on every taluka page", "Measured from the pictures"],
];

export default function Accuracy({ onBack, inApp }) {
  return (
    <div className="min-h-full p-6 overflow-auto">
      <div className="max-w-3xl mx-auto fade-up">
        {!inApp && <button className="text-sm mb-4" style={{ color: "var(--muted)" }} onClick={onBack}>← Back</button>}
        <h1 className="text-3xl font-bold">What we have measured</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          Nothing here is invented. A number appears only when a file produces it, with how many cases it rests on. Until then it says "to be determined".
        </p>
        <div className="card mt-6 overflow-hidden">
          {ROWS.map(([a, b, c]) => (
            <div key={a} className="grid sm:grid-cols-[2fr_1fr_1.4fr] gap-2 px-4 py-3 border-b text-sm" style={{ borderColor: "var(--line)" }}>
              <div>{a}</div><b style={{ color: b.startsWith("To be") ? "#e5a823" : "#7bb241" }}>{b}</b><span style={{ color: "var(--muted)" }}>{c}</span>
            </div>
          ))}
        </div>
        <div className="card mt-6 p-5">
          <b>What the pilot does show</b>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            In a visibility test on real Sentinel-2 pictures, a sample area in Partur taluka sat clearly below its 2023–2025 greenness from mid-September 2026
            (for example 0.42 against 0.63 in September). Latur and three Konkan sites showed no such gap. This shows the signal exists. It is not an accuracy figure.
          </p>
          <b className="block mt-4">What it does not show</b>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            It does not say why a plot is behind normal. Low greenness can also come from early harvest or late sowing. The alert thresholds are provisional and not yet
            tuned on separate data. Each taluka is one 4 km sample area, and "plots" are 200 m cells, not legal survey plots.
          </p>
        </div>
      </div>
    </div>
  );
}
