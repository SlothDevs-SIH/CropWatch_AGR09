import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

let lenis = null;
/** Smooth scrolling wired into ScrollTrigger. Skipped when the visitor prefers reduced motion. */
export function startSmoothScroll() {
  if (reduced()) return () => {};
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => { gsap.ticker.remove(tick); lenis.destroy(); lenis = null; };
}
export function scrollToTarget(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: "smooth" });
}
export function lockScroll(on) {
  if (!lenis) { document.documentElement.style.overflow = on ? "hidden" : ""; return; }
  on ? lenis.stop() : lenis.start();
}
