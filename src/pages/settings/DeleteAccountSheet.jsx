import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function DeleteAccountSheet({ anchorRef, busy, error, onClose, onConfirm }) {
  const sheetRef = useRef(null);
  const cancelRef = useRef(null);
  const [bounds, setBounds] = useState(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current?.closest(".social-center-scroll") || anchorRef.current;
    const syncBounds = () => {
      const rect = anchor?.getBoundingClientRect();
      if (rect) setBounds({ left: rect.left, width: rect.width });
    };
    syncBounds();
    const observer = new ResizeObserver(syncBounds);
    if (anchor) observer.observe(anchor);
    window.addEventListener("resize", syncBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncBounds);
    };
  }, [anchorRef]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    cancelRef.current?.focus({ preventScroll: true });
    return () => previousFocus?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const buttons = [...sheetRef.current.querySelectorAll("button:not(:disabled)")];
      if (!buttons.length) {
        event.preventDefault();
        return;
      }
      const next = event.shiftKey ? buttons.at(-1) : buttons[0];
      const edge = event.shiftKey ? buttons[0] : buttons.at(-1);
      if (document.activeElement === edge || !buttons.includes(document.activeElement)) {
        event.preventDefault();
        next.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);

  return (
    <div
      className="settings-delete-layer"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
      style={bounds ? { left: bounds.left, width: bounds.width } : undefined}
    >
      <section aria-describedby="settings-delete-description" aria-labelledby="settings-delete-title" aria-modal="true" className="settings-delete-sheet" ref={sheetRef} role="dialog">
        <span aria-hidden="true" className="settings-delete-handle" />
        <div className="settings-delete-content">
          <svg aria-hidden="true" className="settings-delete-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          <h2 id="settings-delete-title">Delete account?</h2>
          <p id="settings-delete-description">Your worlds, stories and notes will be gone within 30 days. Coin balance is refunded to your payment method first.</p>
          {error ? <p className="settings-delete-error" role="alert">{error}</p> : null}
          <button className="settings-delete-confirm" disabled={busy} onClick={onConfirm} type="button">{busy ? "Requesting deletion..." : "Delete my account"}</button>
          <button className="settings-delete-cancel" disabled={busy} onClick={onClose} ref={cancelRef} type="button">Keep it</button>
        </div>
      </section>
    </div>
  );
}
