const KEY = "cw_token";
export const token = {
  get() { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } },
  set(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch {} },
};

export async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.get()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail || "Something went wrong"), { status: res.status });
  return data;
}

const auth = () => ({ Authorization: `Bearer ${token.get()}` });

/** An authenticated file (a photo or the evidence pack) as a blob. */
export async function apiBlob(path) {
  const res = await fetch(path, { headers: auth() });
  if (!res.ok) throw Object.assign(new Error("Could not load the file"), { status: res.status });
  return res.blob();
}

export async function apiUpload(path, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(path, { method: "POST", headers: auth(), body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail || "Upload failed"), { status: res.status });
  return data;
}
