import { useEffect, useState } from "react";
import { api, token } from "@/api";
import { ROLE_LABEL } from "@/lib/levels";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import District from "@/pages/District";
import TalukaMap from "@/pages/TalukaMap";
import Accuracy from "@/pages/Accuracy";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("landing");        // landing | login | app | accuracy
  const [taluka, setTaluka] = useState(null);         // open taluka (null = district level)
  const [checking, setChecking] = useState(!!token.get());

  useEffect(() => {
    if (!token.get()) return;
    api("/api/me").then((u) => signedIn(u)).catch(() => token.set("")).finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function home(u) { return u.role === "district_officer" || u.role === "admin" ? null : u.taluka; }
  function signedIn(u) { setUser(u); setTaluka(home(u)); setPage("app"); }
  const signOut = () => { token.set(""); setUser(null); setTaluka(null); setPage("landing"); };

  if (checking) return null;
  if (!user) {
    if (page === "login") return <Login onDone={signedIn} onBack={() => setPage("landing")} />;
    if (page === "accuracy") return <Accuracy onBack={() => setPage("landing")} />;
    return <Landing onSignIn={() => setPage("login")} onAccuracy={() => setPage("accuracy")} />;
  }

  const district = user.role === "district_officer" || user.role === "admin";
  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-4 px-5 py-3 border-b" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
        <b className="text-lg tracking-tight">Crop<span style={{ color: "var(--accent)" }}>Watch</span></b>
        <span className="chip" style={{ color: "var(--muted)" }}>Pilot data · Jalna district · one season</span>
        <nav className="flex gap-2 ml-4">
          {district && <button className="btn" onClick={() => { setTaluka(null); setPage("app"); }}>District</button>}
          <button className="btn" onClick={() => setPage("accuracy")}>Accuracy</button>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span style={{ color: "var(--muted)" }}>{user.name} · {ROLE_LABEL[user.role]}</span>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          {page === "accuracy" ? <Accuracy onBack={() => setPage("app")} inApp />
            : taluka ? <TalukaMap key={taluka} name={taluka} user={user} onBack={district ? () => setTaluka(null) : null} />
            : <District onOpen={(t) => setTaluka(t)} />}
        </div>
      </main>
    </div>
  );
}
