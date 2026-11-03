import { useEffect, useRef } from "react";
import { gsap, reduced } from "./motion";
import useMagnetic from "./useMagnetic";

const SAY = ["This plot is behind a normal season.", "We could not see this plot this week.", "Confirmed by the farmer or a field visit.", "Accuracy, with how many cases it rests on."];
const NOT = ["Why the crop is stressed.", "What the yield will be.", "That a claim will pay.", "Any accuracy number nobody has measured."];

export default function Honesty({ onAccuracy }) {
  const root = useRef(), btn = useRef();
  useMagnetic(btn);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return;
      gsap.from(".lp-say li", { x: -40, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".lp-say", start: "top 80%" } });
      gsap.from(".lp-not li", { x: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".lp-not", start: "top 80%" } });
      gsap.fromTo(".lp-not li .lp-strike", { scaleX: 0 }, { scaleX: 1, transformOrigin: "0 50%", stagger: 0.18, duration: 0.8, ease: "power3.inOut", scrollTrigger: { trigger: ".lp-not", start: "top 62%" } });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} id="promise" className="lp-sec lp-dark">
      <div className="lp-wrap">
        <p className="lp-kicker">Our promise</p>
        <h2 className="lp-display lp-h2">We only say what we can show.</h2>
        <div className="lp-two">
          <div>
            <h3 className="lp-colhead is-yes">What we say</h3>
            <ul className="lp-say">{SAY.map((s) => <li key={s}><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>{s}</li>)}</ul>
          </div>
          <div>
            <h3 className="lp-colhead is-no">What we do not say</h3>
            <ul className="lp-not">{NOT.map((s) => <li key={s}><span className="lp-strike-wrap">{s}<i className="lp-strike" /></span></li>)}</ul>
          </div>
        </div>
        <div className="lp-acc">
          <div>
            <b>Today, our accuracy is: to be determined.</b>
            <p>It will appear on the accuracy page the moment a file produces it, with the number of cases and a margin. If it is modest, we will show it anyway.</p>
          </div>
          <button ref={btn} className="lp-btn lp-btn-wheat" onClick={onAccuracy}>Open the accuracy page</button>
        </div>
      </div>
    </section>
  );
}
