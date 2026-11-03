import { useEffect, useState } from "react";

/** A tiny hash router: "#/app/district" is the path "/app/district". Deep links, refresh and the back button all work. */
export function useRoute() {
  const read = () => (location.hash.replace(/^#/, "") || "/");
  const [path, setPath] = useState(read);
  useEffect(() => {
    const f = () => setPath(read());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return path;
}
export const go = (p) => { location.hash = p; };
export const replace = (p) => { history.replaceState(null, "", "#" + p); window.dispatchEvent(new HashChangeEvent("hashchange")); };
