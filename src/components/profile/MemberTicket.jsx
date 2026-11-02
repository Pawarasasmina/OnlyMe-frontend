import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiShare, FiX } from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { memberTicketData, showMemberNumber, ticketImage } from "../../utils/memberTicket";
import StoryCreator from "../stories/StoryCreator";
import "./MemberTicket.css";

export default function MemberTicket({ profile }) {
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
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My @seen ticket" });
      else { download(); setError("Ticket saved. You can upload it to Instagram."); }
    } catch (failure) { if (failure.name !== "AbortError") setError("Unable to share. Try saving the image instead."); }
  };
  const close = () => { setOpen(false); setSharing(false); setError(""); };

  return <>
    <button aria-label={`Open your member ticket ${ticket.label}`} className="member-ticket-badge" onClick={() => { setOpen(true); setError(""); }} type="button">{ticket.label}</button>
    {createPortal(<>{open ? <section aria-label="Your ticket" aria-modal="true" className="member-ticket-screen" role="dialog" style={position}>
      <p className="member-ticket-heading">Your ticket</p>
      <div className="member-ticket-card">
        <header><b><em>@</em>seen</b><span>{ticket.city}</span></header>
        <div className="member-ticket-identity"><span>Member</span><strong>{ticket.label}</strong>{ticket.date ? <time>{ticket.date}</time> : null}</div>
        <footer>{ticket.city ? `One of the first in ${ticket.city}.` : "One of the first on @seen."}</footer>
      </div>
      <button className="member-ticket-share" onClick={() => { setImage(ticketImage(ticket)); setSharing(true); }} type="button"><FiShare /> Share</button>
      <button className="member-ticket-close" onClick={close} type="button">Close</button>
      {sharing ? <div className="member-ticket-share-menu" aria-label="Share ticket">
        <header><b>Share your ticket</b><button aria-label="Close sharing" onClick={() => setSharing(false)} type="button"><FiX /></button></header>
        <button onClick={() => { setStoryDraft({ imageUrl: image }); close(); }} type="button"><FiShare /> Story</button>
        <button onClick={externalShare} type="button"><FaInstagram /> Instagram / More</button>
        <button onClick={download} type="button"><FiDownload /> Save image</button>
        {error ? <p role="status">{error}</p> : null}
      </div> : null}
    </section> : null}
    <StoryCreator initialContent={storyDraft} isOpen={Boolean(storyDraft)} onClose={() => setStoryDraft(null)} />
    </>, document.body)}
  </>;
}
