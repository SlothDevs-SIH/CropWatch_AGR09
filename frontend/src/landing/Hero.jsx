import { useCallback, useEffect, useRef } from "react";
import { gsap, ScrollTrigger, reduced, coarse, scrollToTarget } from "./motion";
import SplitText from "./SplitText";
import FieldCanvas from "./FieldCanvas";
import useMagnetic from "./useMagnetic";

export default function Hero({ ready, onSignIn, onAccuracy }) {
  const root = useRef(), plane = useRef(), cta = useRef(), cta2 = useRef();
  const hud = useRef({});
  useMagnetic(cta); useMagnetic(cta2);

  const onStats = useCallback((s) => {
    const h = hud.current;
    if (h.behind) h.behind.textContent = `${s.behind}%`;
    if (h.cloud) h.cloud.textContent = `${s.cloud}%`;
    if (h.date) h.date.textContent = s.label;
  }, []);

  useEffect(() => { gsap.set(plane.current, { xPercent: -50, yPercent: -50, rotateX: 58, rotateZ: -34, opacity: 0 }); }, []);

  // entrance, played once the preloader has lifted
  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      if (reduced()) { gsap.set(plane.current, { opacity: 1 }); return; }
      gsap.timeline({ defaults: { ease: "power4.out" } })
        .fromTo(plane.current, { scale: 1.35, opacity: 0, rotateZ: -42 }, { scale: 1, opacity: 1, rotateZ: -34, duration: 2.2, ease: "power3.out" }, 0)
        .from(".lp-w", { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.07 }, 0.35)
        .from(".lp-hero-fade", { y: 24, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.95)
        ;
      gsap.from(document.querySelector(".lp-nav"), { y: -30, opacity: 0, duration: 0.8, delay: 1.1, ease: "power3.out" });
      // scroll: the field drifts and tilts away while the words lift off
      gsap.to(".lp-hero-plane-wrap", { yPercent: -14, scale: 1.12, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".lp-hero-copy", { yPercent: -22, opacity: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "20% top", end: "bottom top", scrub: true } });
      gsap.to(".lp-hero-hud", { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "60% top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, [ready]);

  // pointer parallax on the field
  useEffect(() => {
    if (coarse() || reduced()) return;
    const el = root.current;
    const rx = gsap.quickTo(plane.current, "rotateX", { duration: 1.2, ease: "power3" });
    const mv = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      rx(58 + ny * 6);
      el.style.setProperty("--mx", nx.toFixed(3)); el.style.setProperty("--my", ny.toFixed(3));
    };
    el.addEventListener("pointermove", mv);
    return () => el.removeEventListener("pointermove", mv);
  }, []);

  return (
    <section ref={root} className="lp-hero" id="top">
      <div className="lp-hero-field">
        <div className="lp-hero-plane-wrap">
          <div ref={plane} className="lp-hero-plane"><FieldCanvas onStats={onStats} /></div>
        </div>
      </div>
      <div className="lp-hero-vignette" />

      <div className="lp-hero-copy">
        <div className="lp-hero-fade lp-pill">Pilot · Jalna district, Maharashtra · Soybean, Kharif 2026</div>
        <h1 className="lp-display lp-h1">
          <SplitText text="Know which plots are falling behind," />
          <br />
          <SplitText className="lp-h1-soft" text="before the order." />
        </h1>
        <p className="lp-hero-fade lp-lead">
          Crop Watch compares every plot with its own past seasons using free satellite pictures, so a taluka officer visits the right farms first.
        </p>
        <div className="lp-hero-fade lp-cta-row">
          <button ref={cta} className="lp-btn lp-btn-leaf" onClick={onSignIn}>Open the pilot map</button>
          <button ref={cta2} className="lp-btn lp-btn-ghost" onClick={onAccuracy}>See what we measured</button>
        </div>
      </div>

      <aside className="lp-hero-hud lp-hero-fade" aria-label="Illustration of a season">
        <div className="lp-hud-title"><i className="lp-live" /> A season, illustrated</div>
        <div className="lp-hud-grid">
          <div><span ref={(e) => (hud.current.date = e)}>1 Jun</span><small>Day of season</small></div>
          <div><span ref={(e) => (hud.current.behind = e)}>0%</span><small>Behind normal</small></div>
          <div><span ref={(e) => (hud.current.cloud = e)}>0%</span><small>Cannot see</small></div>
        </div>
        <p>The gold line is a satellite pass. Grey plots are under cloud, and we call them "cannot see", never "fine". Real plots are inside.</p>
      </aside>

      <button className="lp-scroll-cue lp-hero-fade" onClick={() => scrollToTarget("#problem")} aria-label="Scroll to the problem">
        <span>Scroll</span><i />
      </button>
    </section>
  );
}
