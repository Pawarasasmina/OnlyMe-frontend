import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FanToastContext } from "./FanToastContext";

export function FanToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", placement: "bottom" });
  const timeoutRef = useRef(null);
  const sequenceTimerRef = useRef(null);
  const shelfUntilRef = useRef(0);
  const [thanksPosition, setThanksPosition] = useState({});

  const showToast = useCallback(function displayToast(nextMessage, options = {}) {
    if (options.variant === "gift-thanks") {
      window.clearTimeout(sequenceTimerRef.current);
      const remaining = shelfUntilRef.current - Date.now();
      if (remaining > 0) {
        sequenceTimerRef.current = window.setTimeout(() => displayToast(nextMessage, options), remaining + 250);
        return;
      }
    }
    if (options.variant === "gift-shelf") shelfUntilRef.current = Date.now() + (options.duration || 4400);
    window.clearTimeout(timeoutRef.current);
    setToast({ ...options, message: nextMessage, placement: options.placement || "bottom" });
    timeoutRef.current = window.setTimeout(() => setToast((current) => ({ ...current, message: "" })), options.duration || 2400);
  }, []);

  const showGiftSequence = useCallback((gift, recipient, onProfile) => {
    window.clearTimeout(sequenceTimerRef.current);
    const firstName = String(recipient.name || recipient.displayName || "The creator").split(" ")[0];
    const avatar = recipient.avatar || recipient.avatarUrl;
    showToast(`Your ${gift.name} is first on the shelf`, {
      variant: "gift-shelf", title: `On ${firstName}\u2019s profile`, avatar,
      giftImage: gift.imageUrl, action: "View", onAction: onProfile, duration: 4400,
    });
    // Match the reference: celebration, shelf banner, then creator thanks at 12s.
    sequenceTimerRef.current = window.setTimeout(() => showToast("This means more than you think. Thank you.", {
      variant: "gift-thanks", title: `${firstName} thanked you`, avatar,
      onAction: onProfile, duration: 6000,
    }), 7800);
  }, [showToast]);

  useEffect(() => () => {
    window.clearTimeout(timeoutRef.current);
    window.clearTimeout(sequenceTimerRef.current);
  }, []);

  useEffect(() => {
    if (!["gift-thanks", "gift-shelf"].includes(toast.variant)) return undefined;
    const column = document.querySelector(".social-center-scroll");
    if (!column) return undefined;
    const update = () => {
      const bounds = column.getBoundingClientRect();
      setThanksPosition({ left: `${bounds.left + bounds.width / 2}px`, width: `${Math.min(520, bounds.width - 28)}px` });
    };
    update();
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(column);
    return () => { window.removeEventListener("resize", update); observer.disconnect(); };
  }, [toast.variant]);

  const value = useMemo(() => ({ showToast, showGiftSequence }), [showToast, showGiftSequence]);

  return (
    <FanToastContext.Provider value={value}>
      {children}
      {toast.variant === "gift-thanks" ? <div
        aria-live="polite"
        className={`fan-gift-thanks-toast ${toast.message ? "is-visible" : ""}`}
        role="status"
        style={thanksPosition}
      >
        <button aria-label={toast.title} onClick={toast.onAction} tabIndex={toast.message ? 0 : -1} type="button">
          <span className="fan-gift-thanks-avatar">{toast.avatar ? <img alt="" src={toast.avatar} /> : <span>{toast.title?.slice(0, 1)}</span>}</span>
          <span className="fan-gift-thanks-copy"><strong>{toast.title}</strong><small>{"\u201c"}{toast.message}{"\u201d"}</small></span>
        </button>
      </div> : toast.variant === "gift-shelf" ? <div
        aria-live="polite"
        className={`fan-gift-shelf-toast ${toast.message ? "is-visible" : ""}`}
        style={thanksPosition}
        role="status"
      >
        <span className="fan-gift-shelf-media">
          <img alt="" src={toast.avatar} />
          {toast.giftImage ? <img alt="" src={toast.giftImage} /> : null}
        </span>
        <span className="fan-gift-shelf-copy"><strong>{toast.title}</strong><small>{toast.message}</small></span>
        {toast.action ? <button onClick={toast.onAction} type="button">{toast.action}</button> : null}
      </div> : <div
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full border border-atseen-line bg-[#161B24] px-5 py-3 text-center text-xs font-semibold text-atseen-text transition duration-200 ${
          toast.placement === "profile" ? `profile-draft-saved-toast ${toast.message ? "opacity-100" : "invisible opacity-0"}` : toast.message ? "bottom-8 opacity-100" : "-bottom-12 opacity-0"
        }`}
        role="status"
      >
        {toast.message}
      </div>}
    </FanToastContext.Provider>
  );
}
