import { useEffect, useRef, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { msg } from "../../i18n/runtime";
import { useLanguage } from "../../hooks/useLanguage";
import PublicationCoverMedia from "./PublicationCoverMedia";
import "./PublishBanner.css";

export default function PublishBanner({ publication, onDismiss, onNotify }) {
  useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 5200);
    const remove = window.setTimeout(() => dismiss.current?.(), 5520);
    return () => { window.clearTimeout(fade); window.clearTimeout(remove); };
  }, []);
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const url = new URL(`/seen/${encodeURIComponent(publication.id)}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: publication.title || "Seen", url });
      else {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        onNotify?.(msg("profile.linkCopied"));
      }
      dismiss.current?.();
    } catch (error) {
      if (error.name !== "AbortError") onNotify?.(msg("profile.couldNotCopyTheLinkPleaseTryAgain"));
    } finally { setSharing(false); }
  };
  return <aside className={`publication-banner ${leaving ? "is-leaving" : ""}`}>
    <button className="publication-banner-body" onClick={onDismiss} type="button"><span className="publication-banner-cover"><PublicationCoverMedia alt="" media={publication.coverMedia} /></span><span role="status"><b><FiCheck />{publication.updated ? msg("celebrations.updated") : msg("admin.published")}</b><small>{publication.aiBonusGranted === true ? msg("celebrations.aiBonus") : publication.title}</small></span></button>
    <button className="publication-banner-share" disabled={sharing} onClick={share} type="button">{msg("admin.share")}</button>
  </aside>;
}
