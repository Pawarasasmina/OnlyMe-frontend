import { useReactionSelection } from "../../../hooks/useReactionSelection";
/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiEye, FiPlus } from "react-icons/fi";
const QUICK = ["like", "love", "fire", "clap", "laugh", "see_you"];
export default function WallReactionTray({ anchorRef, options, selected, busy, onSelect, onMore, onClose, quickKeys = QUICK, useEyeIcon = true }) {
  __useUiLanguage();
  const { choose, selecting } = useReactionSelection({ busy, onSelect, onClose });
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
    return () => {
      window.removeEventListener("keydown", key); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true);
      if (!restore?.isConnected) return;
      // Applying a reaction briefly disables the anchor. Restore keyboard focus
      // when it becomes available, unless the person has focused another control.
      if (!restore.disabled) { restore.focus({ preventScroll: true }); return; }
      const observer = new MutationObserver(() => {
        if (!restore.isConnected || (document.activeElement !== document.body && document.activeElement !== restore)) { observer.disconnect(); window.clearTimeout(timeout); return; }
        if (!restore.disabled) { restore.focus({ preventScroll: true }); observer.disconnect(); window.clearTimeout(timeout); }
      });
      observer.observe(restore, { attributes: true, attributeFilter: ["disabled"] });
      const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    };
  }, [anchorRef]);
  return createPortal(<div className="wall-reaction-tray-layer"><button aria-label={__msg("fanWeb.closeReactions")} className="wall-reaction-tray-dismiss" onClick={onClose} tabIndex={-1} type="button" /><section aria-label={__msg("fanWeb.chooseAWallNoteReaction")} aria-modal="true" className="wall-reaction-tray" ref={tray} role="dialog" style={position}>{quickKeys.map(key => options.find(option => option.key === key)).filter(Boolean).map(option => <button aria-label={__msg("fanWeb.reaction_bfb553", { value0: selected === option.key ? __msg("profile.remove") : __msg("fanWeb.send"), value1: option.label })} aria-pressed={selected === option.key} disabled={busy || selecting} key={option.key} onClick={(event) => choose(event, selected === option.key ? "" : option.key)} title={option.label} type="button"><span aria-hidden="true">{useEyeIcon && ["see_you", "SEE_YOU"].includes(option.key) ? <FiEye className="wall-reaction-eye" /> : option.icon}</span></button>)}<button aria-label={__msg("fanWeb.moreReactions")} className="wall-reaction-more" disabled={busy || selecting} onClick={onMore} type="button"><FiPlus aria-hidden="true" /></button></section></div>, document.body);
}
