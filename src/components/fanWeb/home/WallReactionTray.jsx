import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiEye, FiPlus } from "react-icons/fi";
const QUICK = ["like", "love", "fire", "clap", "laugh", "see_you"];
export default function WallReactionTray({ anchorRef, options, selected, busy, onSelect, onMore, onClose }) {
  const tray = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  const [position, setPosition] = useState({ visibility: "hidden" });
  useEffect(() => {
    const anchor = anchorRef.current;
    const restore = document.activeElement;
    const update = () => {
      const a = anchor?.getBoundingClientRect();
      const center = anchor?.closest(".social-center-scroll")?.getBoundingClientRect();
      if (!a) return;
      const width = Math.min(300, (center?.width || window.innerWidth) - 20, window.innerWidth - 20);
      const minimum = Math.max(10, (center?.left || 0) + 10);
      const maximum = Math.min(window.innerWidth - width - 10, (center?.right || window.innerWidth) - width - 10);
      setPosition({ width, left: Math.max(minimum, Math.min(a.left, maximum)), top: a.top >= 74 ? a.top - 62 : a.bottom + 10 });
    };
    update();
    tray.current?.querySelector("button")?.focus({ preventScroll: true });
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      const buttons = [...(tray.current?.querySelectorAll("button:not(:disabled)") || [])];
      const index = buttons.indexOf(document.activeElement);
      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const target = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[target]?.focus();
      }
      if (event.key === "Tab" && buttons.length) {
        if (event.shiftKey && index === 0) { event.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!event.shiftKey && index === buttons.length - 1) { event.preventDefault(); buttons[0]?.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); if(restore?.isConnected) restore.focus({ preventScroll: true }); };
  }, [anchorRef]);
  return createPortal(<div className="wall-reaction-tray-layer"><button aria-label="Close reactions" className="wall-reaction-tray-dismiss" onClick={onClose} tabIndex={-1} type="button" /><section aria-label="Choose a Wall note reaction" aria-modal="true" className="wall-reaction-tray" ref={tray} role="dialog" style={position}>{QUICK.map(key => options.find(option => option.key === key)).filter(Boolean).map(option => <button aria-label={`${selected === option.key ? "Remove" : "Send"} ${option.label} reaction`} aria-pressed={selected === option.key} disabled={busy} key={option.key} onClick={() => onSelect(selected === option.key ? "" : option.key)} title={option.label} type="button"><span aria-hidden="true">{option.key === "see_you" ? <FiEye className="wall-reaction-eye" /> : option.icon}</span></button>)}<button aria-label="More reactions" className="wall-reaction-more" onClick={onMore} type="button"><FiPlus aria-hidden="true" /></button></section></div>, document.body);
}
