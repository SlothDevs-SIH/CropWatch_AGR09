import { useEffect, useState } from "react";

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function Accuracy({ onBack, inApp }) {
  const [a, setA] = useState(null);
  useEffect(() => { fetch("/api/accuracy").then((r) => r.json()).then(setA).catch(() => setA({ measured: false })); }, []);

  const wc = a?.whole_taluka_check || [];
  const clear = wc.filter((w) => w.flagged_2026 > w.ordinary_max);
  const lags = wc.map((w) => w.days_before_order).filter((d) => d != null);
  const after = lags.length && lags.every((d) => d <= 0);
  const rows = [];
  wc.forEach((w) => rows.push([
    `Whole ${w.taluka} taluka (${w.farmland_cells.toLocaleString()} farmland cells): flagged in 2026, at the order date`, pct(w.flagged_2026),
    `Every ordinary season: ${pct(w.ordinary_min)} to ${pct(w.ordinary_max)}. ${w.flagged_2026 > w.ordinary_max ? "Above every ordinary season" : "Not clearly above the ordinary seasons"}. The 4 km sample box said ${pct(w.sample_box_2026)}`,
  ]));
  if (a?.measured) {
    const d = a.detection;
    rows.push(
      ["All eight 4 km sample areas: flagged in 2026 (test season)", pct(a.flagged_in_2026_test_season), "Average of the last five dates"],
      ["All eight 4 km sample areas: flagged in ordinary seasons (false alarms)", pct(a.false_alarm_in_ordinary_seasons?.value), `${a.false_alarm_in_ordinary_seasons?.n_taluka_seasons} taluka-seasons, 2019 to 2025`],
      ["Plain 'less green than last reading' rule, same false-alarm rate", `${pct(a.simple_baseline?.flagged_in_2026_test_season)} in 2026`, "It flags 2026 less than ordinary seasons, so it cannot see this drought"],
      ["4 km sample areas where the signal appeared by the order date", `${d.talukas_with_detection} of ${d.talukas_total}`, "Sample boxes only. They can be too high or too low for the taluka, so the whole-taluka rows above are the better evidence"],
    );
  }
  if (a?.field_check) {
    const f = a.field_check, rg = (x) => (x ? ` (range ${pct(x[0])} to ${pct(x[1])})` : "");
    rows.push(
      ["Plots we flagged that were really stressed, on the ground", `${pct(f.flagged.share_stressed)}`, `${f.flagged.n} plots${rg(f.flagged.range)}`],
      ["Plots we did not flag that were stressed anyway", `${pct(f.not_flagged.share_stressed)}`, `${f.not_flagged.n} plots${rg(f.not_flagged.range)}${f.enough_for_a_significance_claim ? "" : ". Too few plots to be sure"}`],
    );
  }
  const open = (a?.not_measured || [
    "Agreement with farmer or field observations (none collected yet)",
    "Taluka-by-taluka match with the official drought list (list not obtained)",
  ]).map((x) => [x.replace(/\s*\(.*\)$/, ""), (x.match(/\((.*)\)$/) || [])[1] || ""]);

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
            {wc.length > 0
              ? `Covering whole talukas, 2026 was flagged above every ordinary season in ${clear.length} of ${wc.length} talukas${clear.length < wc.length ? ", and was marginal or not clearly above in the rest" : ""}. `
              : ""}
            A simple greenness rule could not tell 2026 apart from ordinary seasons at all.
            Rainfall for June to October 2026 was about half the 2018 to 2025 average, which agrees with reports of a deficit near 46% in Jalna.
          </p>
          <b className="block mt-4">What it does not show</b>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            It does not show an early warning. {after ? `In the whole-taluka checks the signal first stood out ${Math.min(...lags.map(Math.abs))} to ${Math.max(...lags.map(Math.abs))} days after the 25 September order, not before it. ` : "The signal appears around the order date, not weeks before it. "}
            What it can do is show where the stress is, plot by plot, at about the time of the order.
            It is not checked against the ground. A "plot" is a 200 m or 300 m square, not a legal survey plot. Eight taluka-sized areas are not yet all covered whole.
            The alert settings were chosen on seasons other than 2026, but on the same places they are then tested on.
          </p>
        </div>
      </div>
    </div>
  );
}
