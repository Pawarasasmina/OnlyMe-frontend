/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import IdentityVerificationFlow from "../verification/IdentityVerificationFlow";
import "./ProfileVerifiedSeal.css";

export default function ProfileVerifiedSeal({ name, isOwner }) {
  __useUiLanguage();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({});
  const doneRef = useRef(null);
  const sheetRef = useRef(null);
  useEffect(() => {
    if (!open || isOwner) return undefined;
    const previousFocus = document.activeElement;
    const center = document.querySelector(".social-center-scroll");
    const update = () => {
      if (!center) return;
      const bounds = center.getBoundingClientRect();
      setPosition({ "--verified-sheet-left": `${bounds.left}px`, "--verified-sheet-width": `${bounds.width}px` });
    };
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key === "Tab") { event.preventDefault(); doneRef.current?.focus(); }
    };
    update(); doneRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    window.addEventListener("resize", update);
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [open, isOwner]);
  return <>
    <VerifiedBadge onClick={() => setOpen(true)} variant="profile" />
    {open && isOwner ? <IdentityVerificationFlow onClose={() => setOpen(false)} /> : open ? createPortal(<div className="profile-verification-layer" style={position}>
      <button aria-label={__msg("profile.closeVerificationDetails")} className="profile-verification-dim" onClick={() => setOpen(false)} tabIndex={-1} type="button" />
      <section aria-labelledby="profile-verification-heading" aria-modal="true" className="profile-verification-sheet" ref={sheetRef} role="dialog">
        <span aria-hidden="true" className="profile-verification-handle" />
        <img alt="" className="profile-verification-illustration" height="210" src="/illustrations/verified-confirmation.svg" width="343" />
        <h2 id="profile-verification-heading">{isOwner ? __msg("profile.youReVerified") : __msg("profile.verifiedAccount")}</h2>
        <div className="profile-verification-name"><b>{name}</b><VerifiedBadge variant="profile" /></div>
        <p>{isOwner ? __msg("profile.yourBadgeIsOnAddABankToWithdraw") : __msg("profile.thisAccountHasAVerifiedBadge")}</p>
        <button className="profile-verification-done" onClick={() => setOpen(false)} ref={doneRef} type="button">{__msg("comments.done")}</button>
      </section>
    </div>, document.body) : null}
  </>;
}
