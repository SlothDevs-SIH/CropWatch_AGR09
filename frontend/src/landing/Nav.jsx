import { useEffect, useState } from "react";
import { scrollToTarget } from "./motion";

const LINKS = [["The problem", "#problem"], ["How it works", "#how"], ["The map", "#map"], ["Who uses it", "#roles"], ["Our promise", "#promise"]];

export default function Nav({ onSignIn, onAccuracy }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 60);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`lp-nav ${solid ? "is-solid" : ""}`}>
      <a className="lp-logo" href="#top" onClick={(e) => { e.preventDefault(); scrollToTarget("#top"); }} aria-label="Crop Watch, back to top">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 22V9" stroke="#a9c75a" strokeWidth="2" strokeLinecap="round" /><path d="M12 14C6 14 3 10 3 5c6 0 9 3 9 9z" fill="#a9c75a" /><path d="M12 10c5 0 8-3 8-8-5 0-8 3-8 8z" fill="#e9d8a6" /></svg>
        <span>Crop<em>Watch</em></span>
      </a>
      <nav aria-label="Sections">
        {LINKS.map(([l, h]) => <a key={h} href={h} onClick={(e) => { e.preventDefault(); scrollToTarget(h); }}>{l}</a>)}
      </nav>
      <div className="lp-nav-right">
        <button className="lp-link" onClick={onAccuracy}>Accuracy</button>
        <button className="lp-btn lp-btn-leaf lp-btn-sm" onClick={onSignIn}>Sign in</button>
      </div>
    </header>
  );
}
