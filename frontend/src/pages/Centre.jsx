import { useEffect, useState } from "react";
import { api, apiBlob } from "@/api";

/** Service-centre screen. Looks a plot up by its id for a farmer who is present and prints an evidence pack. Orders are simulated. */
export default function Centre() {
  const [pid, setPid] = useState("");
  const [html, setHtml] = useState(null);
  const [msg, setMsg] = useState("");
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadOrders = () => api("/api/orders").then(setOrders).catch(() => {});
  useEffect(() => { loadOrders(); }, []);

  async function preview() {
    setMsg(""); setOrder(null); setHtml(null); setBusy(true);
    try {
      const b = await apiBlob(`/api/plots/${pid.trim()}/evidence`);
      setHtml(URL.createObjectURL(new Blob([b], { type: "text/html" })));
    } catch (e) { setMsg(e.status === 404 ? "No such plot id in your taluka. Check the id on the farmer's alert." : e.message); } finally { setBusy(false); }
  }
  async function place() {
    setMsg("");
    try { setOrder(await api("/api/orders", { plot_id: pid.trim() })); loadOrders(); } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Claim help: evidence pack</h1>
      <div className="card p-3 mt-3 text-sm" style={{ borderColor: "var(--ochre)" }}>
        <b style={{ color: "var(--ochre)" }}>Demo mode, no real money.</b> The evidence pack is a report a farmer can attach to a claim. It does <b>not</b> file a claim and does not promise any payout.
        Fees shown are placeholders for the demo, not prices.
      </div>

      <label className="block mt-4 text-sm font-semibold">Plot id from the farmer's alert</label>
      <div className="flex gap-2 mt-1">
        <input className="card px-3 py-2 bg-transparent flex-1" placeholder="e.g. PTW-r064c040" value={pid} onChange={(e) => setPid(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pid && preview()} />
        <button className="btn btn-primary" disabled={!pid.trim() || busy} onClick={preview}>Preview</button>
      </div>
      {msg && <div className="text-sm mt-2" style={{ color: "var(--rust)" }}>{msg}</div>}

      {html && (
        <>
          <iframe title="Evidence pack" src={html} sandbox="" className="w-full mt-4 rounded-xl bg-white" style={{ height: 520, border: "1px solid var(--line)" }} />
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="btn" onClick={() => window.open(html, "_blank")}>Open to print</button>
            <button className="btn btn-primary" onClick={place}>Place a demo order</button>
          </div>
        </>
      )}
      {order && (
        <div className="card p-3 mt-3 text-sm">
          Demo order <b>#{order.order_id}</b> recorded. Placeholder fee ₹{order.fee}, centre share ₹{order.centre_share}. <b>No money moved.</b>
        </div>
      )}

      <h2 className="text-lg font-bold mt-8">Your demo orders</h2>
      <div className="card mt-2 overflow-hidden">
        {orders.map((o) => (
          <div key={o.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2 border-b text-sm" style={{ borderColor: "var(--line)" }}>
            <b>{o.plot_id}</b><span style={{ color: "var(--muted)" }}>{o.at}</span><span>₹{o.fee} (demo)</span>
          </div>
        ))}
        {orders.length === 0 && <div className="px-3 py-3 text-sm" style={{ color: "var(--muted)" }}>No orders yet.</div>}
      </div>
    </div>
  );
}
