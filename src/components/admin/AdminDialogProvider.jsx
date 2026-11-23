import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FiAlertTriangle, FiHelpCircle, FiX } from "react-icons/fi";

const DialogContext = createContext(null);

export function useAdminDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useAdminDialog must be used inside AdminDialogProvider");
  return value;
}

export default function AdminDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const inputRef = useRef(null);
  const resolveRef = useRef(null);

  const close = useCallback((value) => {
    setDialog(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const open = useCallback((options) => new Promise((resolve) => {
    resolveRef.current?.(options.type === "prompt" ? null : false);
    resolveRef.current = resolve;
    setDialog(options);
  }), []);

  const confirm = useCallback((options) => open({ type: "confirm", tone: "warning", confirmLabel: "Confirm", cancelLabel: "Cancel", ...typeof options === "string" ? { title: "Confirm action", description: options } : options }), [open]);
  const prompt = useCallback((options) => open({ type: "prompt", tone: "default", confirmLabel: "Continue", cancelLabel: "Cancel", required: true, ...typeof options === "string" ? { title: options } : options }), [open]);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (event) => { if (event.key === "Escape") close(dialog.type === "prompt" ? null : false); };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); window.clearTimeout(timer); };
  }, [close, dialog]);

  const submit = (event) => {
    event.preventDefault();
    if (dialog.type === "prompt") {
      const value = String(event.currentTarget.elements.dialogValue?.value || "").trim();
      if (dialog.required !== false && !value) return;
      close(value);
    } else close(true);
  };

  const destructive = dialog?.tone === "danger";
  return <DialogContext.Provider value={{ confirm, prompt }}>{children}{dialog ? <div aria-labelledby="admin-dialog-title" aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) close(dialog.type === "prompt" ? null : false); }}><form className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl" onSubmit={submit}><div className="flex items-start gap-4 p-5 sm:p-6"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${destructive ? "bg-red-50 text-red-600" : dialog.tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>{destructive || dialog.tone === "warning" ? <FiAlertTriangle size={21} /> : <FiHelpCircle size={21} />}</span><div className="min-w-0 flex-1"><h2 className="text-lg font-black text-slate-950" id="admin-dialog-title">{dialog.title}</h2>{dialog.description ? <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">{dialog.description}</p> : null}</div><button aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => close(dialog.type === "prompt" ? null : false)} type="button"><FiX /></button></div>{dialog.type === "prompt" ? <div className="px-5 pb-5 sm:px-6"><label className="block text-xs font-bold text-slate-600">{dialog.inputLabel || "Reason"}<input autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 caret-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-orange-100" defaultValue={dialog.defaultValue || ""} maxLength={dialog.maxLength || 500} min={dialog.min} name="dialogValue" placeholder={dialog.placeholder || "Enter details"} ref={inputRef} type={dialog.inputType || "text"} /></label>{dialog.help ? <p className="mt-2 text-xs text-slate-400">{dialog.help}</p> : null}</div> : null}<div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100" onClick={() => close(dialog.type === "prompt" ? null : false)} type="button">{dialog.cancelLabel}</button><button className={`rounded-xl px-4 py-2.5 text-sm font-black text-white ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-slate-800"}`} type="submit">{dialog.confirmLabel}</button></div></form></div> : null}</DialogContext.Provider>;
}
