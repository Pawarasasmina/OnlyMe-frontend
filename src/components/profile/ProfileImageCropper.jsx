import { useState } from "react";
import { FiX } from "react-icons/fi";

function outputFileName(kind) {
  return `${kind || "image"}.jpg`;
}

export default function ProfileImageCropper({ kind, onCancel, onSave, saving, source }) {
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const config = {
    avatar: { aspect: "aspect-square", frame: "w-[min(72vw,320px)] rounded-full", height: 800, label: "profile photo", width: 800 },
    cover: { aspect: "aspect-[3/1]", frame: "w-full rounded-2xl", height: 500, label: "cover", width: 1500 },
    feed: { aspect: "aspect-square", frame: "w-[min(72vw,360px)] rounded-2xl", height: 1080, label: "feed image", width: 1080 },
    seen: { aspect: "aspect-video", frame: "w-full rounded-2xl", height: 1080, label: "Seen image", width: 1920 },
    story: { aspect: "aspect-[9/16]", frame: "h-[min(56vh,520px)] rounded-2xl", height: 1920, label: "story image", width: 1080 },
  }[kind] || { aspect: "aspect-square", frame: "w-[min(72vw,360px)] rounded-2xl", height: 1080, label: "image", width: 1080 };

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
    <div aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" role="dialog">
      <section className="w-full max-w-xl rounded-3xl border border-atseen-line bg-[#171c25] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-black">Adjust {config.label}</h2><p className="mt-1 text-xs text-atseen-muted">Zoom and reposition the image before uploading.</p></div>
          <button aria-label="Close image editor" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={saving} onClick={onCancel} type="button"><FiX /></button>
        </div>

        <div className={`relative mx-auto mt-5 overflow-hidden bg-black ring-1 ring-white/20 ${config.aspect} ${config.frame}`}>
          <img alt="Crop preview" className="h-full w-full select-none object-cover" draggable="false" src={source} style={{ objectPosition: `${50 + x / 2}% ${50 + y / 2}%`, transform: `scale(${zoom})` }} />
          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/30" />
        </div>

        <div className="mx-auto mt-6 max-w-md space-y-4">
          {[['Zoom', zoom, setZoom, 1, 3, 0.01], ['Left / right', x, setX, -100, 100, 1], ['Up / down', y, setY, -100, 100, 1]].map(([label, value, setter, min, max, step]) => (
            <label className="grid grid-cols-[88px_1fr] items-center gap-3 text-xs font-bold text-atseen-muted" key={label}><span>{label}</span><input className="w-full accent-atseen-blue" max={max} min={min} onChange={(event) => setter(Number(event.target.value))} step={step} type="range" value={value} /></label>
          ))}
        </div>

        <div className="mt-7 flex gap-3"><button className="flex-1 rounded-xl border border-atseen-line py-3 text-sm font-bold" disabled={saving} onClick={onCancel} type="button">Cancel</button><button className="flex-1 rounded-xl bg-atseen-blue py-3 text-sm font-black text-atseen-bg disabled:opacity-50" disabled={saving} onClick={save} type="button">{saving ? "Uploading..." : "Save image"}</button></div>
      </section>
    </div>
  );
}
