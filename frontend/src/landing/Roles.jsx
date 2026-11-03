import { useEffect, useRef } from "react";
import { gsap, reduced } from "./motion";

const ROLES = [
  {
    id: "farmer", title: "The farmer", line: "Sees only their own plots. Says whether the satellite is right.",
    ui: () => (
      <div className="lp-ui lp-ui-phone">
        <div className="lp-ui-head">Your plots</div>
        <div className="lp-ui-card"><b>PAR-r01c16</b><span className="lp-tag t-u">Behind normal</span></div>
        <p>Is this plot stressed?</p>
        <div className="lp-ui-btns"><i className="is-press">Stressed</i><i>Fine</i><i>Not sure</i></div>
      </div>
    ),
  },
  {
    id: "taluka", title: "The taluka officer", line: "Sees every plot in one taluka. Visits, records, and decides what gets reported.",
    ui: () => (
      <div className="lp-ui">
        <div className="lp-ui-head">Visit first</div>
        {[["PAR-r01c16", "u", "Awaiting farmer"], ["PAR-r18c01", "u", "Confirmed"], ["PAR-r03c06", "w", "Disputed"], ["PAR-r05c00", "c", "Cannot see"]].map(([a, k, s]) => (
          <div key={a} className="lp-ui-row"><i className={`c-${k}`} /><b>{a}</b><span>{s}</span></div>
        ))}
        <div className="lp-ui-act"><span>Report to district</span></div>
      </div>
    ),
  },
  {
    id: "district", title: "The district officer", line: "Sees which taluka needs attention first, and how much of it could not be seen.",
    ui: () => (
      <div className="lp-ui">
        <div className="lp-ui-head">Taluka ranking <small>illustration</small></div>
        {[["Taluka A", 84], ["Taluka B", 66], ["Taluka C", 51], ["Taluka D", 33], ["Taluka E", 22]].map(([a, w], i) => (
          <div key={a} className="lp-ui-bar"><b>{i + 1}. {a}</b><div><span style={{ "--w": `${w}%` }} /></div></div>
        ))}
        <p>Shows how much of each taluka could not be seen, beside every share.</p>
      </div>
    ),
  },
];

export default function Roles() {
  const root = useRef();
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return;
      gsap.fromTo(".lp-stem-fill", { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "50% 0", scrollTrigger: { trigger: ".lp-roles-list", start: "top 70%", end: "bottom 60%", scrub: true } });
      gsap.utils.toArray(".lp-role").forEach((el) => {
        gsap.from(el.querySelector(".lp-role-text"), { x: -60, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 75%" } });
        gsap.from(el.querySelector(".lp-ui"), { clipPath: "inset(0 0 100% 0)", y: 40, duration: 1.2, ease: "power4.out", scrollTrigger: { trigger: el, start: "top 72%" } });
        if (el.querySelector(".lp-ui-bar")) gsap.from(el.querySelectorAll(".lp-ui-bar span"), { scaleX: 0, transformOrigin: "0 50%", stagger: 0.1, duration: 1.3, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 65%" } });
        gsap.from(el.querySelector(".lp-role-node"), { scale: 0, duration: 0.6, ease: "back.out(3)", scrollTrigger: { trigger: el, start: "top 70%" } });
      });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} id="roles" className="lp-sec lp-paper">
      <div className="lp-wrap">
        <p className="lp-kicker">Who uses it</p>
        <h2 className="lp-display lp-h2 lp-h2-dark">Three people, one chain, nobody guessing.</h2>
        <div className="lp-roles-list">
          <div className="lp-stem"><div className="lp-stem-fill" /></div>
          {ROLES.map((r) => (
            <article key={r.id} className="lp-role">
              <span className="lp-role-node" />
              <div className="lp-role-text"><h3 className="lp-display">{r.title}</h3><p>{r.line}</p></div>
              {r.ui()}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
