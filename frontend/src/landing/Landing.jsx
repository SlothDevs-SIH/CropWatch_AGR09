import { useEffect, useState } from "react";
import "./landing.css";
import { ScrollTrigger, startSmoothScroll } from "./motion";
import Preloader from "./Preloader";
import Cursor from "./Cursor";
import Stalk from "./Stalk";
import Nav from "./Nav";
import Hero from "./Hero";
import Problem from "./Problem";
import Process from "./Process";
import StoryMap from "./StoryMap";
import Roles from "./Roles";
import Honesty from "./Honesty";
import Finale from "./Finale";

const TICKER = ["Sentinel-2 optical pictures", "Sentinel-1 radar through cloud", "CHIRPS rainfall", "ESA WorldCover farmland mask", "Free and open data", "One taluka at a time"];

export default function Landing({ onSignIn, onAccuracy }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stop = startSmoothScroll();
    const t = setTimeout(() => ScrollTrigger.refresh(), 800);   // fonts and the map settle, then recompute pins
    return () => { clearTimeout(t); stop(); ScrollTrigger.getAll().forEach((s) => s.kill()); };
  }, []);

  return (
    <div className="lp-root">
      <Preloader onDone={() => setReady(true)} />
      <Cursor />
      <Stalk />
      <div className="lp-grain" aria-hidden="true" />
      <Nav onSignIn={onSignIn} onAccuracy={onAccuracy} />
      <main>
        <Hero ready={ready} onSignIn={onSignIn} onAccuracy={onAccuracy} />
        <div className="lp-ticker" aria-hidden="true">
          <div>{[...TICKER, ...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}<i /></span>)}</div>
        </div>
        <Problem />
        <Process />
        <StoryMap onSignIn={onSignIn} />
        <Roles />
        <Honesty onAccuracy={onAccuracy} />
        <Finale onSignIn={onSignIn} onAccuracy={onAccuracy} />
      </main>
    </div>
  );
}
