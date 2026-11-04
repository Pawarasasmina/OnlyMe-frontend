import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function DeleteAccountSheet({ anchorRef, busy, error, onClose, onConfirm, step = "delete", onStep, earnings, loading, onRetry, onPayouts }) {
  __useUiLanguage();
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
    (cancelRef.current || sheetRef.current?.querySelector("button"))?.focus({ preventScroll: true });
    return () => previousFocus?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const center = anchorRef.current?.closest(".social-center-scroll");
    if (!center) return undefined;
    const previous = center.style.overflow;
    center.style.overflow = "hidden";
    return () => { center.style.overflow = previous; };
  }, [anchorRef]);

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
      <section aria-describedby="settings-delete-description" aria-labelledby="settings-delete-title" aria-modal="true" className={`settings-delete-sheet ownership-sheet ownership-${step}`} ref={sheetRef} role="dialog">
        <span aria-hidden="true" className="settings-delete-handle" />
        <div className="settings-delete-content">
          {step === "logout" ? <>
            <h2 id="settings-delete-title">{__msg("settings.logoutConfirmationTitle")}</h2>
            <p id="settings-delete-description">{__msg("settings.logoutConfirmationDescription")}</p>
            <button className="settings-delete-confirm" disabled={busy} onClick={onConfirm} type="button">{__msg("layouts.logOut")}</button>
          </> : step === "ownership" ? <>
            <h2 id="settings-delete-title">{__msg("settings.deactivateOrDelete")}</h2>
            <p id="settings-delete-description">{__msg("settings.chooseWhatHappensToYourAccount")}</p>
            <button className="ownership-option" onClick={() => onStep("deactivate")} type="button"><span><b>{__msg("settings.deactivateAccount")}</b><small>{__msg("settings.temporarilyHideYourProfileSeensAndWorldLogBack")}</small></span><span aria-hidden="true">›</span></button>
            <button className="ownership-option ownership-danger" onClick={() => onStep("check")} type="button"><span><b>{__msg("settings.deleteAccount")}</b><small>{__msg("settings.permanentlyRemoveYourAccountAndContentYouHave30")}</small></span><span aria-hidden="true">›</span></button>
          </> : step === "deactivate" ? <>
            <h2 id="settings-delete-title">{__msg("settings.deactivateYourAccount")}</h2>
            <p id="settings-delete-description">{__msg("settings.yourProfileSeensAndWorldAreHiddenUntilYou")}</p>
          </> : step === "check" ? <>
            <h2 id="settings-delete-title">{loading ? __msg("settings.checkingYourEarnings") : __msg("settings.unableToCheckYourEarnings")}</h2>
            <p id="settings-delete-description">{loading ? __msg("settings.pleaseWait") : __msg("settings.pleaseTryAgainBeforeContinuing")}</p>
            {!loading && <button className="settings-delete-confirm" onClick={onRetry} type="button">{__msg("discover.tryAgain")}</button>}
          </> : step === "earnings" ? <>
            <h2 id="settings-delete-title">{__msg("profile.youHave")} {new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD" }).format(earnings)} {__msg("settings.notWithdrawn")}</h2>
            <p id="settings-delete-description">{__msg("settings.earningsCanTBePaidOutAfterTheAccount")}</p>
          </> : <>
            <svg aria-hidden="true" className="settings-delete-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
            <h2 id="settings-delete-title">{__msg("settings.deleteAccount_f58423")}</h2>
            <p id="settings-delete-description">{__msg("settings.yourWorldsStoriesAndNotesWillBeGoneWithin")}</p>
          </>}
          {error ? <p className="settings-delete-error" role="alert">{__systemMessage(error)}</p> : null}
          {step === "deactivate" || step === "delete" ? <button className="settings-delete-confirm" disabled={busy} onClick={onConfirm} type="button">{busy ? (step === "deactivate" ? __msg("settings.deactivating") : __msg("settings.requestingDeletion")) : step === "deactivate" ? __msg("settings.deactivate") : __msg("settings.deleteMyAccount")}</button> : null}
          {step === "earnings" ? <><button className="settings-delete-confirm ownership-payouts" onClick={onPayouts} type="button">{__msg("settings.goToPayouts")}</button><button className="settings-delete-cancel ownership-danger" onClick={() => onStep("delete")} type="button">{__msg("settings.deleteAnyway")}</button></> : null}
          {step !== "earnings" && <button aria-label={step === "ownership" ? __msg("settings.closeAccountOwnershipAndControl") : undefined} className={`settings-delete-cancel ${step === "ownership" ? "ownership-close" : ""}`} disabled={busy} onClick={step === "deactivate" ? () => onStep("ownership") : onClose} ref={cancelRef} type="button">{step === "delete" ? __msg("settings.keepIt") : __msg("admin.cancel")}</button>}

        </div>
      </section>
    </div>
  );
}
