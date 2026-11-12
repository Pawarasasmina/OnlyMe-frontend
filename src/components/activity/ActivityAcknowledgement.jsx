import { useState } from "react";
import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import "./ActivityAcknowledgement.css";

export default function ActivityAcknowledgement({ acknowledged = false, onAcknowledge }) {
  useLanguage();
  const [seen, setSeen] = useState(Boolean(acknowledged));
  return <button className="activity-presence-ack" aria-label={msg("activity.seenAcknowledgement")} aria-pressed={seen} onKeyDown={event => event.stopPropagation()} onClick={event => {
    event.stopPropagation();
    const next = !seen;
    setSeen(next);
    if (!next) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      event.currentTarget.getAnimations().forEach(animation => animation.cancel());
      event.currentTarget.animate([
        { transform: "scale(1)" }, { transform: "scale(1.5) rotate(14deg)", offset: .35 },
        { transform: "scale(.9)", offset: .65 }, { transform: "scale(1)" },
      ], { duration: 500, easing: "cubic-bezier(.3,1.3,.4,1)" });
    }
    onAcknowledge?.();
  }} type="button">{seen ? <>{msg("activity.seenAcknowledgement")} {"\u2713"}</> : <svg aria-hidden="true" viewBox="0 0 64 40"><path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="currentColor" /><circle cx="32" cy="20" r="8.5" fill="#0A0C0F" /></svg>}</button>;
}
