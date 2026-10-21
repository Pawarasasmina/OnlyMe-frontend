import { useRef, useState } from "react";
import { FiX } from "react-icons/fi";

function outputFileName(kind) {
  return `${kind || "image"}.jpg`;
}

export default function ProfileImageCropper({ kind, onCancel, onSave, saving, source }) {
  const isSeenCover = kind === "seen";
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const gestureRef = useRef({ pointers: new Map() });
  const config = {
    avatar: { aspect: "aspect-square", frame: "w-[min(72vw,320px)] rounded-full", height: 800, label: "profile photo", width: 800 },
    cover: { aspect: "aspect-[3/1]", frame: "w-full rounded-2xl", height: 500, label: "cover", width: 1500 },
    feed: { aspect: "aspect-square", frame: "w-[min(72vw,360px)] rounded-2xl", height: 1080, label: "feed image", width: 1080 },
    seen: { aspect: "aspect-[4/5]", frame: "w-full rounded-2xl", height: 1350, label: "Seen cover", width: 1080 },
    story: { aspect: "aspect-[9/16]", frame: "h-[min(56vh,520px)] rounded-2xl", height: 1920, label: "story image", width: 1080 },
  }[kind] || { aspect: "aspect-square", frame: "w-[min(72vw,360px)] rounded-2xl", height: 1080, label: "image", width: 1080 };
  const translateLimit = ((zoom - 1) / (2 * zoom)) * 100;
  const translateX = -(x / 100) * translateLimit;
  const translateY = -(y / 100) * translateLimit;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const beginGesture = (event) => {
    if (saving) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const gesture = gestureRef.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    gesture.startX = x;
    gesture.startY = y;
    gesture.startZoom = zoom;
    gesture.origin = points.length === 1 ? points[0] : {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
    gesture.distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
  };
  const moveGesture = (event) => {
    const gesture = gestureRef.current;
    if (!gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    const center = points.length === 1 ? points[0] : {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
    const bounds = event.currentTarget.getBoundingClientRect();
    setX(clamp(gesture.startX - ((center.x - gesture.origin.x) / bounds.width) * 200, -100, 100));
    setY(clamp(gesture.startY - ((center.y - gesture.origin.y) / bounds.height) * 200, -100, 100));
    if (points.length > 1 && gesture.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      setZoom(clamp(gesture.startZoom * (distance / gesture.distance), 1, 3));
    }
  };
  const endGesture = (event) => {
    const gesture = gestureRef.current;
    gesture.pointers.delete(event.pointerId);
    const points = [...gesture.pointers.values()];
    if (points.length) {
      gesture.startX = x;
      gesture.startY = y;
      gesture.startZoom = zoom;
      gesture.origin = points[0];
      gesture.distance = 0;
    }
  };
  const zoomWithWheel = (event) => {
    if (!isSeenCover || saving) return;
    event.preventDefault();
    setZoom((current) => clamp(current - event.deltaY * 0.002, 1, 3));
  };

  const save = async () => {
    const image = new Image();
    image.src = source;
    await image.decode();

    const { width, height } = config;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const drawnWidth = image.naturalWidth * scale;
    const drawnHeight = image.naturalHeight * scale;
    const freeX = Math.max(0, drawnWidth - width);
    const freeY = Math.max(0, drawnHeight - height);
    const left = (width - drawnWidth) / 2 - (x / 100) * freeX / 2;
    const top = (height - drawnHeight) / 2 - (y / 100) * freeY / 2;

    context.drawImage(image, left, top, drawnWidth, drawnHeight);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) onSave(new File([blob], outputFileName(kind), { type: "image/jpeg" }));
  };

  return (
    <div aria-modal="true" className={`profile-image-crop-layer ${isSeenCover ? "is-seen-cover" : ""}`} role="dialog">
      <button aria-label="Close image editor" className="profile-image-crop-scrim" disabled={saving} onClick={onCancel} type="button" />
      <section className="profile-image-crop-sheet">
        {isSeenCover ? <span aria-hidden="true" className="profile-image-crop-handle" /> : null}
        <div className="profile-image-crop-head">
          <div><h2>{isSeenCover ? "Cover — exactly as in the feed" : `Adjust ${config.label}`}</h2><p>{isSeenCover ? "Move it with your fingers in any direction · two fingers to zoom" : "Zoom and reposition the image before uploading."}</p></div>
          <button aria-label="Close image editor" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={saving} onClick={onCancel} type="button"><FiX /></button>
        </div>

        <div
          aria-label="Crop preview. Drag to reposition and pinch with two fingers to zoom."
          className={`profile-image-crop-preview ${config.aspect} ${config.frame}`}
          onPointerCancel={endGesture}
          onPointerDown={beginGesture}
          onPointerMove={moveGesture}
          onPointerUp={endGesture}
          onWheel={zoomWithWheel}
          style={{ touchAction: "none" }}
        >
          <img alt="Crop preview" className="h-full w-full select-none object-cover" draggable="false" src={source} style={{ objectPosition: `${50 + x / 2}% ${50 + y / 2}%`, transform: `translate(${translateX}%, ${translateY}%) scale(${zoom})` }} />
          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/30" />
        </div>

        <p className="profile-image-crop-touch-hint">Drag to move · pinch with two fingers to zoom</p>

        <div className="profile-image-crop-controls">
          {[['Zoom', zoom, setZoom, 1, 3, 0.01], ['Left / right', x, setX, -100, 100, 1], ['Up / down', y, setY, -100, 100, 1]].map(([label, value, setter, min, max, step]) => (
            <label className="grid grid-cols-[88px_1fr] items-center gap-3 text-xs font-bold text-atseen-muted" key={label}><span>{label}</span><input className="w-full accent-atseen-blue" max={max} min={min} onChange={(event) => setter(Number(event.target.value))} step={step} type="range" value={value} /></label>
          ))}
        </div>

        <div className="profile-image-crop-actions"><button className="profile-image-crop-cancel" disabled={saving} onClick={onCancel} type="button">Cancel</button><button className="profile-image-crop-save" disabled={saving} onClick={save} type="button">{saving ? "Uploading..." : isSeenCover ? "Done" : "Save image"}</button></div>
      </section>
    </div>
  );
}
