import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FanToastContext } from "./FanToastContext";

export function FanToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef(null);

  const showToast = useCallback((nextMessage) => {
    window.clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = window.setTimeout(() => setMessage(""), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <FanToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className={`fixed left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full border border-atseen-line bg-[#161B24] px-5 py-3 text-center text-xs font-semibold text-atseen-text transition duration-200 ${
          message ? "bottom-8 opacity-100" : "-bottom-12 opacity-0"
        }`}
        role="status"
      >
        {message}
      </div>
    </FanToastContext.Provider>
  );
}
