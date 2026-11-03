import { useEffect, useRef, useState } from "react";
import { gsap, lockScroll, reduced } from "./motion";

/** A seed sprouts, the name appears, and the soil lifts away. Plays once per visit. */
export default function Preloader({ onDone }) {
  const root = useRef();
  const [show] = useState(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("cw_intro") === "1"; } catch {}
    return !seen && !reduced();
  });
  useEffect(() => {
    if (!show) { onDone(); return; }
    lockScroll(true);
    const ctx = gsap.context(() => {
      const stem = root.current.querySelector(".lp-pre-stem");
      const len = stem.getTotalLength();
      gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(".lp-pre-leaf", { scale: 0, transformOrigin: "0% 100%" });
      gsap.timeline({ onComplete: () => { try { sessionStorage.setItem("cw_intro", "1"); } catch {} lockScroll(false); onDone(); } })
        .to(stem, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" })
        .to(".lp-pre-leaf", { scale: 1, duration: 0.6, stagger: 0.18, ease: "back.out(2.2)" }, "-=0.5")
        .from(".lp-pre-name span", { yPercent: 110, duration: 0.7, stagger: 0.05, ease: "power4.out" }, "-=0.4")
        .to(".lp-pre-inner", { opacity: 0, duration: 0.35 }, "+=0.35")
        .to(root.current, { yPercent: -100, duration: 0.9, ease: "power4.inOut" })
        .set(root.current, { display: "none" });
    }, root);
    return () => { ctx.revert(); lockScroll(false); };
  }, []);
  if (!show) return null;
  return (
    <div ref={root} className="lp-pre">
      <div className="lp-pre-inner">
        <svg viewBox="0 0 80 110" width="64" height="88" aria-hidden="true">
          <path className="lp-pre-stem" d="M40 108 C40 80 40 60 40 30" fill="none" stroke="#a9c75a" strokeWidth="3" strokeLinecap="round" />
          <path className="lp-pre-leaf" d="M40 62 C22 62 10 50 8 34 C26 34 38 44 40 62z" fill="#a9c75a" />
          <path className="lp-pre-leaf" d="M40 46 C58 46 70 34 72 18 C54 18 42 28 40 46z" fill="#e9d8a6" />
        </svg>
        <div className="lp-pre-name" aria-label="Crop Watch">{"CropWatch".split("").map((c, i) => <span key={i}>{c}</span>)}</div>
      </div>
    </div>
  );
}
