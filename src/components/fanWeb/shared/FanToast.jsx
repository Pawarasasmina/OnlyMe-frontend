import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FanToastContext } from "./FanToastContext";

export function FanToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [placement, setPlacement] = useState("bottom");
  const timeoutRef = useRef(null);

  const showToast = useCallback((nextMessage, options = {}) => {
    window.clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    setPlacement(options.placement || "bottom");
    timeoutRef.current = window.setTimeout(() => setMessage(""), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <FanToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full border border-atseen-line bg-[#161B24] px-5 py-3 text-center text-xs font-semibold text-atseen-text transition duration-200 ${
          placement === "profile" ? `profile-draft-saved-toast ${message ? "opacity-100" : "invisible opacity-0"}` : message ? "bottom-8 opacity-100" : "-bottom-12 opacity-0"
        }`}
        role="status"
      >
        {message}
      </div>
    </FanToastContext.Provider>
  );
}
