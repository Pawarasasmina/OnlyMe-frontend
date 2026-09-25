import { useEffect, useRef } from "react";

export default function FinancialConfirmDialog({ open, title, onClose, children, actions, presentation = "dialog" }) {
  const ref = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previous.current = document.activeElement;
    const node = ref.current;
    node?.querySelector("button,input,textarea")?.focus();
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const items = [...node.querySelectorAll("button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]")];
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous.current?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  if (presentation === "center-sheet") return <div aria-modal="true" className="financial-center-sheet-layer" role="dialog">
    <button aria-label="Close dialog" className="financial-center-sheet-scrim" onClick={onClose} type="button" />
    <section className="financial-center-sheet" ref={ref}>
      <span aria-hidden="true" className="financial-center-sheet-handle" />
      <div className="financial-center-sheet-header"><h2>{title}</h2><button aria-label="Close" onClick={onClose} type="button">×</button></div>
      <div className="financial-center-sheet-content">{children}</div>
      <div className="financial-center-sheet-actions">{actions}</div>
    </section>
  </div>;
  return <div aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-[2px]" role="dialog">
    <button aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
    <section className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/15 bg-[#12151b] p-5 text-atseen-text shadow-[0_28px_90px_rgba(0,0,0,.85)] sm:p-6" ref={ref}>
      <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-white/70 transition hover:bg-white/10 hover:text-white" onClick={onClose} type="button">✕</button></div>
      <div className="mt-4">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
    </section>
  </div>;
}
