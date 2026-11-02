import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePhotoSurface } from "./usePhotoSurface";

const clamp = value => Math.max(.4, Math.min(4, value));
export default function PhotoCropSheet({ file, onClose, onSave, saving, error }) {
  const [url, setUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState("");
  const frame = useRef(null);
  const gesture = useRef({ pointers: new Map() });
  const position = usePhotoSurface(Boolean(file), onClose);
  useEffect(() => { if (!file) return undefined; const src = URL.createObjectURL(file); setUrl(src); return () => URL.revokeObjectURL(src); }, [file]);
  if (!file) return null;
  const busy = saving || preparing;
  const start = event => {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const g = gesture.current; g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...g.pointers.values()];
    g.origin = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    g.distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    g.crop = crop; setDragging(true);
  };
  const move = event => {
    const g = gesture.current; if (!g.pointers.has(event.pointerId)) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...g.pointers.values()];
    const center = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const box = frame.current.getBoundingClientRect();
    const scale = g.distance ? clamp(g.crop.scale * Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / g.distance) : g.crop.scale;
    const ratio = scale / g.crop.scale;
    const x = g.crop.x * ratio + (center.x - g.origin.x) / box.width - ((g.origin.x - box.left) / box.width - .5) * (ratio - 1);
    const y = g.crop.y * ratio + (center.y - g.origin.y) / box.height - ((g.origin.y - box.top) / box.height - .5) * (ratio - 1);
    setCrop({ scale, x: Math.abs(x) < .02 ? 0 : x, y: Math.abs(y) < .02 ? 0 : y });
  };
  const end = event => { const g = gesture.current; g.pointers.delete(event.pointerId); if (!g.pointers.size) setDragging(false); else { g.origin = [...g.pointers.values()][0]; g.distance = 0; g.crop = crop; } };
  const wheel = event => {
    if (busy) return;
    event.preventDefault(); const box = frame.current.getBoundingClientRect();
    setCrop(current => { const scale = clamp(current.scale * Math.exp(-event.deltaY * .002)); const ratio = scale / current.scale; return { scale, x: current.x * ratio - ((event.clientX - box.left) / box.width - .5) * (ratio - 1), y: current.y * ratio - ((event.clientY - box.top) / box.height - .5) * (ratio - 1) }; });
  };
  const save = async () => {
    setPreparing(true); setLocalError("");
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350; const ctx = canvas.getContext("2d");
      const fit = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * fit, height = image.naturalHeight * fit;
      ctx.filter = "blur(24px) brightness(.55)"; ctx.drawImage(image, (1080 - width * 1.15) / 2, (1350 - height * 1.15) / 2, width * 1.15, height * 1.15); ctx.filter = "none";
      ctx.drawImage(image, (1080 - width * crop.scale) / 2 + crop.x * 1080, (1350 - height * crop.scale) / 2 + crop.y * 1350, width * crop.scale, height * crop.scale);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .9));
      if (!blob) throw new Error("Could not prepare the photo");
      await onSave(new File([blob], "profile-photo.jpg", { type: "image/jpeg" }));
    } catch (failure) { setLocalError(failure.message || "Could not prepare this photo."); }
    finally { setPreparing(false); }
  };
  return createPortal(<div className="photo-modal-layer" style={position}>
    <button aria-label="Close photo framing" className="photo-modal-dim" disabled={busy} onClick={onClose} type="button" />
    <section aria-label="Photo framing" aria-modal="true" className="photo-crop-sheet" role="dialog">
      <span className="photo-sheet-handle" /><h2>Photo · 4:5</h2><p>Move it with your fingers in any direction · two fingers to zoom</p>
      <div aria-label="Reposition photo" className={`photo-crop-frame ${dragging ? "is-dragging" : ""}`} onDoubleClick={() => setCrop(current => ({ x: 0, y: 0, scale: current.scale === 1 ? .6 : 1 }))} onKeyDown={event => {
        const step = event.shiftKey ? .05 : .01;
        const offset = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
        if (offset) { event.preventDefault(); setCrop(current => ({ ...current, x: current.x + offset[0], y: current.y + offset[1] })); }
      }} onPointerCancel={end} onPointerDown={start} onPointerMove={move} onPointerUp={end} onWheel={wheel} ref={frame} role="img" style={{ backgroundImage: `url("${url}")` }} tabIndex={0}>
        <img alt="Selected photo preview" draggable="false" src={url} style={{ transform: `translate(${crop.x * 100}%,${crop.y * 100}%) scale(${crop.scale})` }} />
        {dragging ? <span aria-hidden="true" className={`photo-crop-grid ${crop.x === 0 ? "center-x" : ""} ${crop.y === 0 ? "center-y" : ""}`} /> : null}
      </div>
      {error || localError ? <p className="photo-error" role="alert">{error || localError}</p> : null}
      <button className="photo-primary" disabled={busy || !url} onClick={save} type="button">{busy ? "Saving…" : "Done"}</button>
      <button className="photo-cancel" disabled={busy} onClick={onClose} type="button">Cancel</button>
    </section>
  </div>, document.body);
}
