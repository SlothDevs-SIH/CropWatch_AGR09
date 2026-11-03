import { useEffect } from "react";
import { gsap, coarse, reduced } from "./motion";

/** Buttons lean toward the pointer, then spring back. */
export default function useMagnetic(ref, strength = 0.28) {
  useEffect(() => {
    const el = ref.current;
    if (!el || coarse() || reduced()) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength, duration: 0.4, ease: "power3.out" });
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [ref, strength]);
}
