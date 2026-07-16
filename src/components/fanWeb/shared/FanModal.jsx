import { useEffect, useId, useRef } from "react";
import { FiX } from "react-icons/fi";

function FanModal({ children, className = "", isOpen, onClose, title }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable?.[0];
        const last = focusable?.[focusable.length - 1];

        if (!first || !last) {
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className={`max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-atseen-line bg-[#0B0E13] p-5 shadow-glow outline-none sm:p-7 ${className}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="mb-4 flex items-center gap-4">
          <h2 className="min-w-0 flex-1 text-lg font-bold text-atseen-text" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-atseen-line bg-white/[0.03] text-atseen-muted transition hover:border-atseen-blue/50 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default FanModal;
