import { useEffect, useRef } from "react";
import { gsap, reduced } from "./motion";
import SplitText from "./SplitText";
import FieldCanvas from "./FieldCanvas";
import useMagnetic from "./useMagnetic";

export default function Finale({ onSignIn, onAccuracy }) {
  const root = useRef(), b1 = useRef(), b2 = useRef();
  useMagnetic(b1); useMagnetic(b2);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return;
      gsap.from(".lp-w", { yPercent: 115, rotate: 3, duration: 1.2, stagger: 0.09, ease: "power4.out", scrollTrigger: { trigger: ".lp-finale-h", start: "top 80%" } });
      gsap.from(".lp-finale-in", { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".lp-finale-h", start: "top 70%" } });
      gsap.fromTo(".lp-finale-field", { yPercent: 25, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 80%", end: "center 55%", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="lp-sec lp-dark lp-finale">
      <div className="lp-finale-field"><div><FieldCanvas still={0.5} /></div></div>
      <div className="lp-wrap lp-finale-copy">
        <h2 className="lp-display lp-finale-h"><SplitText text="Visit the right" /><br /><SplitText className="lp-h1-soft" text="farm first." /></h2>
        <p className="lp-lead lp-finale-in">A pilot for Jalna district, built to be measured honestly and extended one taluka at a time.</p>
        <div className="lp-cta-row lp-finale-in">
          <button ref={b1} className="lp-btn lp-btn-leaf" onClick={onSignIn}>Open the pilot map</button>
          <button ref={b2} className="lp-btn lp-btn-ghost" onClick={onAccuracy}>See what we measured</button>
        </div>
      </div>
      <footer className="lp-foot-main lp-wrap">
        <div><b>Crop Watch</b><p>Village-scale crop stress early warning. Team SlothDevs: Soham, Kaushal, Shreyas and Vedashree.</p></div>
        <div><b>Data</b><p>Contains modified Copernicus Sentinel data (2023 to 2026). Rainfall: CHIRPS. Farmland mask: ESA WorldCover. Boundaries: geoBoundaries (DataMeet, Pathways/LGD).</p></div>
        <div><b>Honesty</b><p>Pilot data for one district and one season. The field illustrations on this page are not real plots.</p></div>
      </footer>
    </section>
  );
}
