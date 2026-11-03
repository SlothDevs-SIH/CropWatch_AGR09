import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, reduced } from "./motion";

const STEPS = [
  ["Look", "A satellite passes over every farm area every few days. The pictures are free."],
  ["Compare", "Each plot is measured against its own last three seasons, at the same time of year."],
  ["Flag", "Plots behind normal turn amber, then red. Under cloud, a plot is marked cannot see, never fine."],
  ["Verify", "The farmer confirms. The taluka officer visits. Only then is a plot reported to the district."],
];
const LEVEL = ["n", "n", "w", "n", "u", "n", "n", "w", "n", "n", "n", "c", "n", "w", "u", "u", "n", "n", "c", "n", "w", "n", "n", "n",
  "n", "u", "u", "w", "n", "n", "n", "c", "w", "w", "n", "n", "n", "n", "u", "n", "n", "c", "n", "w", "n", "n", "w", "n"];

const Grid = ({ kind }) => (
  <div className={`lp-mini lp-mini-${kind}`}>
    {LEVEL.map((l, i) => <i key={i} className={`c-${kind === "flag" ? l : "n"}`} style={{ "--i": i, "--d": `${(i % 8) * 60 + Math.floor(i / 8) * 70}ms` }} />)}
    {kind === "look" && <b className="lp-mini-scan" />}
  </div>
);

export default function Process() {
  const root = useRef();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return;
      ScrollTrigger.create({
        trigger: root.current, start: "top top", end: "+=320%", pin: true, scrub: true, anticipatePin: 1,
        onUpdate: (s) => { setStep(Math.min(3, Math.floor(s.progress * 4))); root.current.style.setProperty("--p", s.progress.toFixed(3)); },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="how" className="lp-sec lp-dark lp-process">
      <div className="lp-wrap lp-process-grid">
        <div className="lp-process-left">
          <p className="lp-kicker">How it works</p>
          <h2 className="lp-display lp-h2">Four steps, and a human at the end of each alert.</h2>
          <ol className="lp-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t} className={i === step ? "is-on" : i < step ? "is-done" : ""}>
                <span className="lp-step-dot" />
                <div><b>{t}</b><p>{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="lp-process-bar"><i /></div>
        </div>

        <div className="lp-stage" aria-live="polite">
          <div className={`lp-panel ${step === 0 ? "is-on" : ""}`}>
            <Grid kind="look" />
            <p className="lp-cap">Satellite pass · colour and infrared · about every five days</p>
          </div>

          <div className={`lp-panel ${step === 1 ? "is-on" : ""}`}>
            <svg viewBox="0 0 520 300" className="lp-chart" role="img" aria-label="Illustration: this season dips below the average of past seasons">
              <g stroke="#33402a">{[40, 110, 180, 250].map((y) => <line key={y} x1="40" x2="500" y1={y} y2={y} />)}</g>
              <path className="lp-line-normal" d="M40 230 C110 200 160 90 230 70 S360 90 420 140 480 210 500 225" />
              <path className="lp-line-now" d="M40 232 C110 205 160 100 230 84 S330 140 380 188 450 240 500 250" />
              <circle className="lp-dot-now" cx="500" cy="250" r="6" />
              <text x="44" y="30" className="lp-t">Average of the last three seasons (dashed)</text>
              <text x="44" y="288" className="lp-t lp-t-now">This season</text>
            </svg>
            <p className="lp-cap">Illustration. Real plots show their own curve against their own normal.</p>
          </div>

          <div className={`lp-panel ${step === 2 ? "is-on" : ""}`}>
            <Grid kind="flag" />
            <div className="lp-legend"><span><i className="c-n" />Normal</span><span><i className="c-w" />Watch</span><span><i className="c-u" />Urgent</span><span><i className="c-c" />Cannot see</span></div>
          </div>

          <div className={`lp-panel ${step === 3 ? "is-on" : ""}`}>
            <div className="lp-chain">
              {[["Farmer", "Confirms or disputes"], ["Taluka officer", "Visits and records"], ["District officer", "Sees what was reported"]].map(([a, b], i) => (
                <div key={a} className="lp-node" style={{ "--k": i }}><b>{a}</b><small>{b}</small></div>
              ))}
              <span className="lp-token" />
            </div>
            <div className="lp-status">
              <span>Awaiting farmer</span><span>Confirmed</span><span>Reported to district</span>
            </div>
            <p className="lp-cap">A report tells the district office, with evidence. It does not file a claim.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
