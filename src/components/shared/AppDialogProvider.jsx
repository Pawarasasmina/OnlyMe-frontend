import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg, systemMessage } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiX } from "react-icons/fi";

let openDialog = null;

export function confirmDialog(options) {
  const config = typeof options === "string" ? { message: options } : options;
  return new Promise((resolve) => {
    if (openDialog) openDialog({ kind: "confirm", ...config, resolve });
    else resolve(false);
  });
}

export function promptDialog(options, defaultValue = "") {
  const config = typeof options === "string" ? { message: options, defaultValue } : options;
  return new Promise((resolve) => {
    if (openDialog) openDialog({ kind: "prompt", ...config, resolve });
    else resolve(null);
  });
}

export default function AppDialogProvider() {
  __useUiLanguage();
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState("");
  const [sheetPosition, setSheetPosition] = useState(undefined);
  const inputRef = useRef(null);

  useEffect(() => {
    openDialog = (next) => {
      setValue(next.defaultValue || "");
      setDialog(next);
    };
    return () => { openDialog = null; };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event) => {
      if (event.key === "Escape") close(dialog.kind === "confirm" ? false : null);
      if (event.key === "Enter" && dialog.kind === "prompt" && value.trim()) finish();
    };
    window.addEventListener("keydown", keydown);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); };
  }, [dialog, value]);

  useEffect(() => {
    if (!dialog) {
      setSheetPosition(undefined);
      return undefined;
    }
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) {
      setSheetPosition(undefined);
      return undefined;
    }
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--seen-sheet-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--seen-sheet-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [dialog]);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };
  const finish = () => close(dialog.kind === "prompt" ? value : true);

  if (!dialog) return null;
  const destructive = dialog.danger !== false && dialog.kind === "confirm";
  return createPortal(
    <div aria-modal="true" className="app-dialog-layer" role="dialog">
      <button aria-label={__msg("system.AppDialogProvider.5c461d1518")} className="app-dialog-scrim" onClick={() => close(dialog.kind === "confirm" ? false : null)} type="button" />
      <section className="app-dialog-sheet" style={sheetPosition}>
        <span aria-hidden="true" className="app-dialog-handle" />
        <header><span className={destructive ? "is-danger" : ""}><FiAlertTriangle /></span><div><h2>{systemMessage(dialog.title) || (dialog.kind === "prompt" ? __msg("system.AppDialogProvider.911a0b354b") : __msg("system.AppDialogProvider.3a799cc037"))}</h2>{dialog.message ? <p>{systemMessage(dialog.message)}</p> : null}</div><button aria-label={__msg("activity.close")} onClick={() => close(dialog.kind === "confirm" ? false : null)} type="button"><FiX /></button></header>
        {dialog.kind === "prompt" ? <label>{systemMessage(dialog.label) || __msg("system.AppDialogProvider.195759356a")}<textarea maxLength={dialog.maxLength || 1000} onChange={(event) => setValue(event.target.value)} placeholder={systemMessage(dialog.placeholder) || ""} ref={inputRef} rows={3} value={value} /></label> : null}
        <footer><button disabled={dialog.busy} onClick={() => close(dialog.kind === "confirm" ? false : null)} type="button">{systemMessage(dialog.cancelLabel) || __msg("admin.cancel")}</button><button className={destructive ? "is-danger" : "is-primary"} disabled={dialog.kind === "prompt" && !value.trim()} onClick={finish} type="button">{systemMessage(dialog.confirmLabel) || (dialog.kind === "prompt" ? __msg("profile.continue") : __msg("social.confirm"))}</button></footer>
      </section>
    </div>,
    document.body
  );
}
