import { api } from "@/api";

// Field checks made without signal wait in this phone's storage and are sent when the phone is online again.
// Photos are not queued: they need a connection (the screens say so).
const KEY = "cw_queue_v1";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} window.dispatchEvent(new Event("cw-queue")); };

export const queueSize = () => read().length;

/** Sends a check now, or queues it if there is no network. HTTP errors (wrong role, bad value) are real errors and are thrown. */
export async function submitCheck(plotId, body) {
  try {
    await api(`/api/plots/${plotId}/checks`, body);
    return { sent: true };
  } catch (e) {
    if (e.status) throw e;
    write([...read(), { plotId, body, at: Date.now() }]);
    return { sent: false };
  }
}

export async function flushQueue() {
  let items = read();
  for (const it of [...items]) {
    try {
      await api(`/api/plots/${it.plotId}/checks`, it.body);
    } catch (e) {
      if (!e.status) break;                                            // still offline: stop and keep the rest
    }
    items = items.filter((x) => x !== it && !(x.at === it.at && x.plotId === it.plotId));   // sent, or refused by the server: do not retry forever
    write(items);
  }
}
