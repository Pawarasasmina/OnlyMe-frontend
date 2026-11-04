import { useEffect, useRef, useState } from "react";

export function usePhotoSurface(open, onClose) {
  const [position, setPosition] = useState({});
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const center = document.querySelector(".social-center-scroll");
    const update = () => { if (center) { const bounds = center.getBoundingClientRect(); setPosition({ "--photo-left": `${bounds.left}px`, "--photo-width": `${bounds.width}px` }); } };
    const key = event => { if (event.key === "Escape") close.current(); };
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    update(); window.addEventListener("resize", update); window.addEventListener("keydown", key);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    return () => { document.body.style.overflow = overflow; previous?.focus(); observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("keydown", key); };
  }, [open]);
  return position;
}
