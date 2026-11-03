import { useState } from "react";
import { apiUpload } from "@/api";
import { submitCheck } from "@/lib/offline";
import { useT } from "@/lib/i18n";

const CHOICES = ["stressed", "fine", "not_sure"];

/** Stressed / Fine / Not sure, with an optional photo and note. The answer works with no signal; a photo needs a connection. */
export default function CheckForm({ plotId, title, onDone, big = false }) {
  const { t } = useT();
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(status) {
    setBusy(true); setMsg("");
    try {
      let photo_id = null, photoNote = "";
      if (file) {
        try { photo_id = (await apiUpload(`/api/plots/${plotId}/photo`, file)).photo_id; }
        catch (e) { if (e.status) throw e; photoNote = " Photo not sent (no signal)."; }
      }
      const r = await submitCheck(plotId, { status, note, photo_id });
      setNote(""); setFile(null);
      setMsg((r.sent ? t("saved") : t("offlineSaved")) + photoNote);
      onDone?.();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="card p-3 mt-4">
      <b className="text-sm">{title}</b>
      <textarea className="card w-full mt-2 p-2 bg-transparent text-sm" rows={2} placeholder={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="btn mt-2 block text-center text-sm">
        {file ? `📷 ${file.name.slice(0, 22)}` : `📷 ${t("addPhoto")}`}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <div className={`mt-2 flex gap-2 ${big ? "flex-col" : ""}`}>
        {CHOICES.map((k) => (
          <button key={k} disabled={busy} onClick={() => send(k)} className="btn flex-1" style={big ? { padding: "16px", fontSize: "1.05rem" } : undefined}>{t(k)}</button>
        ))}
      </div>
      {msg && <div className="text-sm mt-2" style={{ color: "var(--ochre)" }}>{msg}</div>}
    </div>
  );
}
