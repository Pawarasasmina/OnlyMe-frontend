import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiShare, FiX } from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { memberTicketData, showMemberNumber, ticketImage } from "../../utils/memberTicket";
import StoryCreator from "../stories/StoryCreator";
import "./MemberTicket.css";

export default function MemberTicket({ profile }) {
  __useUiLanguage();
  const { user } = useAuth();
  const ticket = memberTicketData(profile, user || {});
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({});
  const [storyDraft, setStoryDraft] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const center = document.querySelector(".social-center-scroll");
    const update = () => {
      if (!center) return;
      const bounds = center.getBoundingClientRect();
      setPosition({ left: bounds.left, width: bounds.width });
    };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); setSharing(false); } };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    window.addEventListener("resize", update);
    window.addEventListener("keydown", escape);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("keydown", escape); };
  }, [open]);

  if (!ticket?.badgeEligible || !showMemberNumber({ ...user, ...profile })) return null;

  const download = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = `seen-ticket-${ticket.number}.png`;
    link.click();
  };
  const externalShare = async () => {
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], `seen-ticket-${ticket.number}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: __msg("profile.mySeenTicket") });
      else { download(); setError(__msg("profile.ticketSavedYouCanUploadItToInstagram")); }
    } catch (failure) { if (failure.name !== "AbortError") setError(__msg("profile.unableToShareTrySavingTheImageInstead")); }
  };
  const close = () => { setOpen(false); setSharing(false); setError(""); };

  return <>
    <button aria-label={__msg("profile.openYourMemberTicket", { value0: ticket.label })} className="member-ticket-badge" onClick={() => { setOpen(true); setError(""); }} type="button">{ticket.label}</button>
    {createPortal(<>{open ? <section aria-label={__msg("profile.yourTicket")} aria-modal="true" className="member-ticket-screen" role="dialog" style={position}>
      <p className="member-ticket-heading">{__msg("profile.yourTicket")}</p>
      <div className="member-ticket-card">
        <header><b><em>@</em>{__msg("branding.seen")}</b><span>{ticket.city}</span></header>
        <div className="member-ticket-identity"><span>{__msg("fanWeb.member")}</span><strong>{ticket.label}</strong>{ticket.date ? <time>{ticket.date}</time> : null}</div>
        <footer>{ticket.city ? __msg("profile.oneOfTheFirstIn", { value0: ticket.city }) : __msg("profile.oneOfTheFirstOnSeen")}</footer>
      </div>
      <button className="member-ticket-share" onClick={() => { setImage(ticketImage(ticket)); setSharing(true); }} type="button"><FiShare /> {__msg("admin.share")}</button>
      <button className="member-ticket-close" onClick={close} type="button">{__msg("activity.close")}</button>
      {sharing ? <div className="member-ticket-share-menu" aria-label={__msg("profile.shareTicket")}>
        <header><b>{__msg("profile.shareYourTicket")}</b><button aria-label={__msg("profile.closeSharing")} onClick={() => setSharing(false)} type="button"><FiX /></button></header>
        <button onClick={() => { setStoryDraft({ imageUrl: image }); close(); }} type="button"><FiShare /> {__msg("activity.story")}</button>
        <button onClick={externalShare} type="button"><FaInstagram /> {__msg("profile.instagramMore")}</button>
        <button onClick={download} type="button"><FiDownload /> {__msg("profile.saveImage")}</button>
        {error ? <p role="status">{__systemMessage(error)}</p> : null}
      </div> : null}
    </section> : null}
    <StoryCreator initialContent={storyDraft} isOpen={Boolean(storyDraft)} onClose={() => setStoryDraft(null)} />
    </>, document.body)}
  </>;
}
