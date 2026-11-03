import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { gsap, ScrollTrigger, reduced } from "./motion";
import { JALNA_TALUKAS } from "./talukas";

const STYLE = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f140c" } }] };
const STAGES = [
  ["Maharashtra", "Thirty-six districts. One pilot. Every other district says “not covered yet” until we have data for it."],
  ["Jalna district", "Eight talukas, one sample area in each. Every sample is read against its own past seasons."],
  ["Every plot", "Sign in, and the camera flies from the state down to a single 200 metre plot, then on to the next."],
];

function boundsOf(geom) {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = (c) => (typeof c[0] === "number" ? ((w = Math.min(w, c[0])), (e = Math.max(e, c[0])), (s = Math.min(s, c[1])), (n = Math.max(n, c[1]))) : c.forEach(walk));
  walk(geom.coordinates);
  return [[w, s], [e, n]];
}

/** A map that stays on screen while the page scrolls, flying from Maharashtra to Jalna to one taluka. */
export default function StoryMap({ onSignIn }) {
  const root = useRef(), box = useRef(), mapRef = useRef(null), cams = useRef({});
  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);

  useEffect(() => {
    let dead = false, raf = 0;
    const markers = [];
    fetch("/maharashtra.json").then((r) => r.json()).then((mh) => {
      if (dead) return;
      const map = new maplibregl.Map({ container: box.current, style: STYLE, center: [79, 21], zoom: 3, attributionControl: false, interactive: false });
      mapRef.current = map;
      map.on("load", () => {
        const jal = mh.districts.features.find((f) => f.properties.name === "Jalna");
        cams.current = {
          0: { ...map.cameraForBounds(boundsOf(mh.state.geometry), { padding: 40 }), pitch: 36, bearing: -8 },
          1: { ...map.cameraForBounds(boundsOf(jal.geometry), { padding: 90 }), pitch: 46, bearing: -14 },
          2: { center: [76.21, 19.60], zoom: 11.9, pitch: 62, bearing: 28 },
        };
        map.addSource("d", { type: "geojson", data: mh.districts });
        map.addSource("s", { type: "geojson", data: mh.state });
        map.addSource("t", { type: "geojson", data: { type: "FeatureCollection", features: JALNA_TALUKAS.map(([n, x, y]) => ({ type: "Feature", properties: { n }, geometry: { type: "Point", coordinates: [x, y] } })) } });
        map.addLayer({ id: "fill", type: "fill", source: "d", paint: { "fill-color": ["case", ["==", ["get", "name"], "Jalna"], "#2f4a35", "#1b2616"] } });
        map.addLayer({ id: "line", type: "line", source: "d", paint: { "line-color": "#3a4830", "line-width": 0.8 } });
        map.addLayer({ id: "rise", type: "fill-extrusion", source: "d", filter: ["==", ["get", "name"], "Jalna"], paint: { "fill-extrusion-color": "#a9c75a", "fill-extrusion-height": 9000, "fill-extrusion-opacity": 0.55 } });
        map.addLayer({ id: "state", type: "line", source: "s", paint: { "line-color": "#e9d8a6", "line-width": 1.8 } });
        map.addLayer({ id: "ring", type: "circle", source: "t", paint: { "circle-radius": 8, "circle-color": "#e5a823", "circle-opacity": 0, "circle-opacity-transition": { duration: 900 }, "circle-stroke-width": 2, "circle-stroke-color": "#f1ebdd", "circle-stroke-opacity": 0, "circle-stroke-opacity-transition": { duration: 900 } } });
        JALNA_TALUKAS.forEach(([n, x, y]) => {
          const el = document.createElement("div"); el.className = "lp-tlabel"; el.textContent = n;
          markers.push(new maplibregl.Marker({ element: el, offset: [0, -16] }).setLngLat([x, y]).addTo(map));
        });
        map.jumpTo({ ...cams.current[0], zoom: 2.4, pitch: 0 });
        fly(0, true);
        const tick = (t) => {
          raf = requestAnimationFrame(tick);
          const k = 0.5 + 0.5 * Math.sin(t / 500);
          if (stageRef.current >= 1) map.setPaintProperty("ring", "circle-radius", 7 + k * 5);
        };
        raf = requestAnimationFrame(tick);
      });
    });
    function fly(s, first) {
      const map = mapRef.current; if (!map || !cams.current[s]) return;
      const dur = first ? 3200 : 2800;
      map.stop();
      map.flyTo({ ...cams.current[s], duration: reduced() ? 0 : dur, curve: 1.7, essential: true });
      const on = s >= 1;
      map.setPaintProperty("ring", "circle-opacity", on ? 0.9 : 0);
      map.setPaintProperty("ring", "circle-stroke-opacity", on ? 1 : 0);
      map.setPaintProperty("rise", "fill-extrusion-height", s === 0 ? 9000 : s === 1 ? 2500 : 0);
      root.current?.classList.toggle("is-labels", on);
    }
    root.current.__fly = fly;
    return () => { dead = true; cancelAnimationFrame(raf); markers.forEach((m) => m.remove()); mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current, start: "top top", end: "bottom bottom",
        onUpdate: (s) => {
          const next = Math.min(2, Math.floor(s.progress * 3));
          if (next !== stageRef.current) { stageRef.current = next; setStage(next); root.current.__fly?.(next); }
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="map" className="lp-story">
      <div className="lp-story-sticky">
        <div className="lp-story-mapwrap"><div ref={box} style={{ width: "100%", height: "100%" }} /></div>
        <div className="lp-story-shade" />
        <div className="lp-story-copy lp-wrap">
          <p className="lp-kicker">From state to plot</p>
          <div className="lp-beats">
            {STAGES.map(([t, d], i) => (
              <div key={t} className={`lp-beat ${i === stage ? "is-on" : ""}`}>
                <h2 className="lp-display lp-h2">{t}</h2>
                <p className="lp-lead">{d}</p>
              </div>
            ))}
          </div>
          <div className="lp-dots">{STAGES.map((_, i) => <i key={i} className={i === stage ? "is-on" : ""} />)}</div>
          <button className="lp-btn lp-btn-leaf" onClick={onSignIn}>Sign in and fly down</button>
        </div>
        <div className="lp-story-credit">Boundaries: geoBoundaries (DataMeet, Pathways/LGD). Sample areas are approximate, not taluka outlines.</div>
      </div>
    </section>
  );
}
