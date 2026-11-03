import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "./motion";

/** A thin stalk on the right edge that grows as you scroll, with a leaf at each quarter. */
export default function Stalk() {
  const stem = useRef(), leaves = useRef([]);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(stem.current, { scaleY: 0, transformOrigin: "50% 100%" });
      ScrollTrigger.create({
        start: 0, end: "max", scrub: 0.4,
        onUpdate: (s) => {
          gsap.set(stem.current, { scaleY: s.progress });
          leaves.current.forEach((l, i) => l && gsap.to(l, { scale: s.progress > (i + 1) / 5 ? 1 : 0, duration: 0.5, ease: "back.out(2)", overwrite: true }));
        },
      });
    });
    return () => ctx.revert();
  }, []);
  return (
    <div className="lp-stalk" aria-hidden="true">
      <div ref={stem} className="lp-stalk-stem" />
      {[0, 1, 2, 3].map((i) => (
        <svg key={i} ref={(el) => (leaves.current[i] = el)} className={`lp-leaf lp-leaf-${i}`} viewBox="0 0 24 24"><path d="M2 22C2 10 10 2 22 2c0 12-8 20-20 20z" fill="currentColor" /></svg>
      ))}
    </div>
  );
}
