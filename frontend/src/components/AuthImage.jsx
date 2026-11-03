import { useEffect, useState } from "react";
import { apiBlob } from "@/api";

/** A photo that needs the sign-in header, shown through a blob. */
export default function AuthImage({ photoId, alt = "Field photo" }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url, on = true;
    apiBlob(`/api/photos/${photoId}`).then((b) => { if (on) { url = URL.createObjectURL(b); setSrc(url); } }).catch(() => {});
    return () => { on = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);
  return src ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={alt} className="rounded-lg mt-2" style={{ maxHeight: 140 }} /></a> : null;
}
