import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
export default function WallSheetFrame({ anchorRef, title, onClose, children }) {
  const sheet = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [position, setPosition] = useState({});
  useEffect(() => {
    const host = anchorRef.current;
    const center = host?.closest(".social-center-scroll");
    const restore = document.activeElement;
    const overflow = center?.style.overflow;
    const inert = host?.inert;
    const update = () => { const r = center?.getBoundingClientRect(); if (r) setPosition({ left: r.left, width: r.width, top: Math.max(0,r.top), bottom: Math.max(0,window.innerHeight-r.bottom) }); };
    update();
    if (host) host.inert = true;
    if (center) center.style.overflow = "hidden";
    const observer = new ResizeObserver(update);
    if (center) observer.observe(center);
    window.addEventListener("resize", update);
    sheet.current?.querySelector("input,button")?.focus();
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === "Tab") {
        const targets = [...sheet.current.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
        const first=targets[0], last=targets.at(-1);
        if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown",key,true);
    return () => { if(host) host.inert=inert; if(center) center.style.overflow=overflow; observer.disconnect(); window.removeEventListener("resize",update); window.removeEventListener("keydown",key,true); if(restore?.isConnected) restore.focus(); };
  }, [anchorRef]);
  return createPortal(<div className="wall-topic-layer" style={position}><button aria-label="Close picker" tabIndex={-1} className="wall-topic-scrim" onClick={onClose} type="button"/><section role="dialog" aria-modal="true" aria-label={title} className="wall-topic-sheet wall-place-sheet" ref={sheet}><span className="wall-topic-handle" aria-hidden="true"/>{children}</section></div>, document.body);
}
