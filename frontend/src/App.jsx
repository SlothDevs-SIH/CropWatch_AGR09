import { useEffect, useState } from "react";
import { api, token } from "@/api";
import { ROLE_LABEL } from "@/lib/levels";
import { go, replace, useRoute } from "@/lib/router";
import { LangSwitch, useT } from "@/lib/i18n";
import { flushQueue, queueSize } from "@/lib/offline";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import District from "@/pages/District";
import TalukaMap from "@/pages/TalukaMap";
import Accuracy from "@/pages/Accuracy";
import Farmer from "@/pages/Farmer";
import Centre from "@/pages/Centre";
import Admin from "@/pages/Admin";
import Reported from "@/pages/Reported";
import About from "@/pages/About";

const homeFor = (u) =>
  u.role === "district_officer" || u.role === "admin" ? "/app/district"
    : u.role === "taluka_officer" ? `/app/area/${u.home_area}`
      : u.role === "farmer" ? "/app/farmer" : "/app/centre";

const NAV = {
  district_officer: [["/app/district", "district"], ["/app/reported", "reported"]],
  admin: [["/app/district", "district"], ["/app/reported", "reported"], ["/app/admin", "admin"]],
  taluka_officer: [["HOME", "myTaluka"], ["/app/reported", "reported"]],
  farmer: [["/app/farmer", "myPlots"]],
  centre_operator: [["/app/centre", "claimHelp"]],
};

export default function App() {
  const path = useRoute();
  const { t } = useT();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!token.get());
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(queueSize());

  useEffect(() => {
    if (!token.get()) return;
    api("/api/me").then(setUser).catch(() => token.set("")).finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const up = () => { setOnline(true); flushQueue(); }, down = () => setOnline(false), q = () => setPending(queueSize());
    window.addEventListener("online", up); window.addEventListener("offline", down); window.addEventListener("cw-queue", q);
    if (navigator.onLine) flushQueue();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); window.removeEventListener("cw-queue", q); };
  }, []);

  const [route, query] = path.split("?");
  const params = new URLSearchParams(query || "");
  const signOut = () => { token.set(""); setUser(null); go("/"); };
  const signedIn = (u) => { setUser(u); go("/app"); };

  // keep redirects out of render
  useEffect(() => {
    if (checking) return;
    if (route.startsWith("/app") && !user) replace("/login");
    else if (user && route === "/app") replace(homeFor(user));
  }, [route, user, checking]);

  if (checking) return null;

  // ---- public pages ----
  if (!user || !route.startsWith("/app")) {
    if (route === "/login" && !user) return <Login onDone={signedIn} onBack={() => go("/")} />;
    if (route === "/accuracy" && !user) return <Accuracy onBack={() => go("/")} />;
    if (route === "/about" && !user) return <About />;
    if (!user || route === "/" || route === "/login") return <Landing onSignIn={() => go(user ? "/app" : "/login")} onAccuracy={() => go("/accuracy")} />;
  }

  // ---- the signed-in shell ----
  const role = user.role;
  const nav = (NAV[role] || []).map(([p, k]) => [p === "HOME" ? homeFor(user) : p, k]);
  nav.push(["/accuracy", "accuracy"], ["/about", "about"]);
  const wrongRole =
    (route === "/app/district" && !["district_officer", "admin"].includes(role)) ||
    (route === "/app/admin" && role !== "admin") || (route === "/app/farmer" && role !== "farmer") || (route === "/app/centre" && role !== "centre_operator") ||
    (route === "/app/reported" && !["district_officer", "admin", "taluka_officer"].includes(role));
  const district = role === "district_officer" || role === "admin";

  let page;
  if (wrongRole) page = <div className="p-8" style={{ color: "var(--muted)" }}>This page is not for your role. <button className="underline" onClick={() => go(homeFor(user))}>Go to your page</button></div>;
  else if (route === "/accuracy") page = <Accuracy inApp />;
  else if (route === "/about") page = <About inApp />;
  else if (route === "/app/district") page = <District />;
  else if (route === "/app/reported") page = <Reported />;
  else if (route === "/app/admin") page = <Admin />;
  else if (route === "/app/farmer") page = <Farmer user={user} />;
  else if (route === "/app/centre") page = <Centre />;
  else if (route.startsWith("/app/area/")) {
    const key = decodeURIComponent(route.slice("/app/area/".length));
    page = <TalukaMap key={key} name={key} user={user} focus={params.get("plot")} onBack={district ? () => go("/app/district") : null} />;
  } else page = null;

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 border-b flex-wrap" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
        <a href="#/" className="text-lg font-bold tracking-tight" aria-label="Crop Watch home">Crop<span style={{ color: "var(--leaf)" }}>Watch</span></a>
        <nav className="flex gap-1 sm:gap-2 flex-wrap" aria-label="Main">
          {nav.map(([p, k]) => (
            <button key={p + k} onClick={() => go(p)} className="btn text-sm" style={{ padding: "6px 10px", borderColor: route === p || path.startsWith(p + "?") ? "var(--leaf)" : undefined }}>{t(k)}</button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
          <span className="chip" style={{ color: online ? "var(--leaf)" : "var(--ochre)" }}>{online ? t("online") : t("offline")}{pending > 0 ? ` · ${pending} ${t("pending")}` : ""}</span>
          <LangSwitch />
          <span className="hidden md:inline" style={{ color: "var(--muted)" }}>{user.name} · {ROLE_LABEL[role] || role}</span>
          <button className="btn" style={{ padding: "6px 10px" }} onClick={signOut}>{t("signOut")}</button>
        </div>
      </header>
      <main className="flex-1 min-h-0 relative"><div className="absolute inset-0 overflow-auto">{page}</div></main>
    </div>
  );
}
