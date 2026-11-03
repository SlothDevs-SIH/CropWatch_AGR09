import { useEffect, useRef } from "react";
import { gsap, reduced } from "./motion";

const STATEMENT = "In 2026 the drought order for Maharashtra came on 25 September, late in the Kharif season. By then the season was nearly over.";

const STATS = [
  { n: 265, suffix: "", label: "talukas declared drought-hit in the September 2026 order", note: "as reported" },
  { n: 33, suffix: "%", prefix: "about ", label: "lower soybean output reported for the season", note: "as reported; figures vary" },
  { n: 25, suffix: " Sep", label: "the day the order arrived, with the season already nearly four months in", note: "state order" },
];

export default function Problem() {
  const root = useRef();
  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = root.current.querySelectorAll(".lp-pw");
      if (reduced()) { gsap.set(words, { opacity: 1 }); return; }
      gsap.fromTo(words, { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: "none",
        scrollTrigger: { trigger: ".lp-statement", start: "top 78%", end: "bottom 45%", scrub: true } });
      root.current.querySelectorAll(".lp-count").forEach((el) => {
        const end = Number(el.dataset.n), o = { v: 0 };
        gsap.to(o, { v: end, duration: 2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => { el.textContent = Math.round(o.v); } });
      });
      gsap.from(".lp-stat", { y: 60, opacity: 0, duration: 1, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".lp-stats", start: "top 85%" } });
      gsap.fromTo(".lp-season-fill", { scaleX: 0 }, { scaleX: 1, ease: "none", transformOrigin: "0 50%", scrollTrigger: { trigger: ".lp-season", start: "top 85%", end: "top 40%", scrub: true } });
      gsap.from(".lp-season-pin", { scale: 0, duration: 0.7, ease: "back.out(3)", scrollTrigger: { trigger: ".lp-season", start: "top 55%" } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="problem" className="lp-sec lp-paper">
      <div className="lp-wrap">
        <p className="lp-kicker">The problem</p>
        <h2 className="lp-display lp-statement">
          {STATEMENT.split(" ").map((w, i) => <span key={i} className="lp-pw">{w} </span>)}
        </h2>

        <div className="lp-stats">
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-n lp-display">{s.prefix}<span className="lp-count" data-n={s.n}>{s.n}</span>{s.suffix}</div>
              <p>{s.label}</p>
              <small>{s.note}</small>
            </div>
          ))}
        </div>

        <div className="lp-season" aria-label="Kharif season from June to October with the drought order on 25 September">
          <div className="lp-season-bar"><div className="lp-season-fill" /></div>
          <div className="lp-season-pin"><i /><span>25 Sep · drought order</span></div>
          <div className="lp-season-months"><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
          <p className="lp-season-note">Days of warning we can give before an order like this: <b>to be determined</b>. We will measure it and show it, not promise it.</p>
        </div>

        <p className="lp-foot">Reported figures are from press and government notices in September and October 2026. Sources and conflicting numbers are listed in our project plan.</p>
      </div>
    </section>
  );
}
