import { useEffect, useRef } from "react";
import { gsap, coarse, reduced } from "./motion";

/** A soft ring that follows the pointer and swells over anything clickable. Not shown on touch screens. */
export default function Cursor() {
  const dot = useRef(), ring = useRef();
  useEffect(() => {
    if (coarse() || reduced()) return;
    const d = dot.current, r = ring.current;
    gsap.set([d, r], { xPercent: -50, yPercent: -50 });
    const xd = gsap.quickTo(d, "x", { duration: 0.1 }), yd = gsap.quickTo(d, "y", { duration: 0.1 });
    const xr = gsap.quickTo(r, "x", { duration: 0.5, ease: "power3" }), yr = gsap.quickTo(r, "y", { duration: 0.5, ease: "power3" });
    const move = (e) => { xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY); r.style.opacity = 1; d.style.opacity = 1; };
    const over = (e) => r.classList.toggle("is-big", !!e.target.closest("a,button,[data-cursor]"));
    window.addEventListener("pointermove", move); window.addEventListener("pointerover", over);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over); };
  }, []);
  return (<><div ref={ring} className="lp-cursor-ring" /><div ref={dot} className="lp-cursor-dot" /></>);
}
