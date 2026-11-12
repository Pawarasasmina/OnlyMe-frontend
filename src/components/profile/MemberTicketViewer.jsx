/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiShare } from "react-icons/fi";
import ShareSheet from "../share/ShareSheet";
import { ticketImage, ticketStoryDraft } from "../../utils/memberTicket";
import "./MemberTicket.css";

export default function MemberTicketViewer({ ticket, author, isOpen: open, onClose }) {
  __useUiLanguage();
  const [sharing, setSharing] = useState(false);
  const [image, setImage] = useState(null);
  const [position, setPosition] = useState({});
  const viewerRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const center = document.querySelector(".social-center-scroll");
    const update = () => {
      if (!center) return;
      const bounds = center.getBoundingClientRect();
      setPosition({ left: bounds.left, width: bounds.width });
    };
    const escape = (event) => {
      if (sharing) return;
      if (event.key === "Escape") { setSharing(false); closeRef.current(); }
      if (event.key !== "Tab") return;
      const buttons = viewerRef.current?.querySelectorAll("button:not([disabled])");
      const first = buttons?.[0], last = buttons?.[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    window.addEventListener("resize", update);
    window.addEventListener("keydown", escape);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("keydown", escape); };
  }, [open, sharing]);

  useEffect(() => {
    if (!open) { setSharing(false); return undefined; }
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.querySelector("button")?.focus();
    return () => { document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open]);

  if (!ticket || !open) return null;

  const close = () => { onClose(); setSharing(false); };
  const sharePayload = {
    contentType: "ticket",
    contentId: author?.id || author?._id,
    route: `/profile/${encodeURIComponent(author?.username || "")}`,
    title: __msg("ticket.shareTitle", { number: ticket.label }),
    previewText: __msg("ticket.shareDescription", { location: (ticket.city ? __msg("profile.oneOfTheFirstIn", { value0: ticket.city }) : __msg("profile.oneOfTheFirstOnSeen")).replace(/[.。]$/, "") }),
    imageUrl: image,
    ticket,
    author,
    get storyDraft() { return ticketStoryDraft(ticket, author); },
  };

  return createPortal(<>{open ? <section aria-label={__msg("profile.yourTicket")} aria-modal="true" className="member-ticket-screen" role="dialog" ref={viewerRef} style={position}>
      <p className="member-ticket-heading">{__msg("profile.yourTicket")}</p>
      <div className="member-ticket-card">
        <header><b><em>@</em>{__msg("branding.seen")}</b><span>{ticket.city}</span></header>
        <div className="member-ticket-identity"><span>{__msg("fanWeb.member")}</span><strong>{ticket.label}</strong>{ticket.date ? <time>{ticket.date}</time> : null}</div>
        <footer>{ticket.city ? __msg("profile.oneOfTheFirstIn", { value0: ticket.city }) : __msg("profile.oneOfTheFirstOnSeen")}</footer>
      </div>
      <button className="member-ticket-share" onClick={() => { setImage(ticketImage(ticket)); setSharing(true); }} type="button"><FiShare /> {__msg("admin.share")}</button>
      <button className="member-ticket-close" onClick={close} type="button">{__msg("activity.close")}</button>

    </section> : null}
    <ShareSheet isOpen={open && sharing} onClose={() => setSharing(false)} payload={sharePayload} variant="ticket" />
    </>, document.body);
}
