import { useEffect, useRef, useState } from "react";
import PublicationCoverMedia from "./PublicationCoverMedia";
import { msg } from "../../i18n/runtime";
import { useLanguage } from "../../hooks/useLanguage";
import "./SuccessMoment.css";

// Match the prototype's seenRing() and its small burst(), not premiumBurst().
export function ConfirmationRings() {
  return <span aria-hidden="true" className="confirmation-rings"><i /><i /></span>;
}

export function OwnershipBurst() {
  return <span aria-hidden="true" className="ownership-burst">✦</span>;
}

export function WorldOrb({ size = 15 }) {
  return <svg aria-hidden="true" className="success-world-orb" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4.5" /><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)" /></svg>;
}

export function JoinMoment({ children }) {
  useLanguage();
  const [welcomed, setWelcomed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomed(true), 1700);
    return () => window.clearTimeout(timer);
  }, []);
  return welcomed ? children : <div className="join-confirmation-moment" role="status"><ConfirmationRings /><span className="join-confirmation-label">{msg("financial.youReInside")}</span></div>;
}

export default function PublishMoment({ media, message, onComplete }) {
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const timer = window.setTimeout(() => complete.current?.(), 1300);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="publish-moment" role="status"><div className="publish-moment-cover"><PublicationCoverMedia alt="" media={media} /><span aria-hidden="true" className="publish-moment-sweep" /></div><p>{message}</p></div>;
}
