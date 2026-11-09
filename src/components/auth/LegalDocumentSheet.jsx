import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { Fragment, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import documents from "./legalDocuments.json";
import "./LegalDocumentSheet.css";

export default function LegalDocumentSheet({ documentKey, onChange, onClose }) {
  __useUiLanguage();
  const panel = useRef(null);
  const document = documents[documentKey];
  useEffect(() => {
    const focus = window.document.activeElement;
    const overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { window.document.body.style.overflow = overflow; focus?.focus(); };
  }, []);
  const handleKeys = (event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    if (event.key !== "Tab") return;
    const elements = [...panel.current.querySelectorAll("button, [tabindex='0']")];
    const first = elements[0], last = elements.at(-1), active = window.document.activeElement;
    if (event.shiftKey && (active === first || active === panel.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (active === last || active === panel.current)) { event.preventDefault(); first?.focus(); }
  };
  return createPortal(<div className="auth-legal-layer" onKeyDown={handleKeys}>
    <button aria-label={__msg("system.LegalDocumentSheet.8ec9bfdd02")} className="auth-legal-dim" onClick={onClose} tabIndex={-1} type="button" />
    <section aria-labelledby="auth-legal-title" aria-modal="true" className="auth-legal-sheet" ref={panel} role="dialog" tabIndex={-1}>
      <div aria-hidden="true" className="auth-legal-grab" />
      <h2 id="auth-legal-title">{document ? __msg(document.titleKey) : __msg("settings.termsPrivacy")}</h2>
      {document ? <>
        <p className="auth-legal-effective">{__msg("system.LegalDocumentSheet.d11a511208")}</p>
        <div className="auth-legal-copy" key={documentKey} tabIndex={0} aria-label={__msg(document.titleKey)}>
          {document.sections.map((section, index) => <Fragment key={section.titleKey}>{index > 0 ? "\n\n" : ""}<b>{__msg(section.titleKey)}</b>{"\n"}{__msg(section.textKey)}</Fragment>)}
        </div>
        <div className="auth-legal-back"><button onClick={() => onChange("menu")} type="button">{__msg("profile.back")}</button></div>
      </> : <>
        <nav aria-label={__msg("system.LegalDocumentSheet.1a83177cd6")} className="auth-legal-menu">{Object.entries(documents).map(([key, item]) => <button key={key} onClick={() => onChange(key)} type="button"><b>{__msg(item.titleKey)}</b><span aria-hidden="true">›</span></button>)}</nav>
        <p className="auth-legal-contact">{__msg("system.LegalDocumentSheet.281b879943")}</p>
      </>}
    </section>
  </div>, window.document.body);
}
