import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiClock, FiInbox, FiLock, FiMessageCircle, FiPhone, FiRefreshCw } from "react-icons/fi";
import { useCalls } from "../../context/callContextBase";
import { callService } from "../../services/callService";
import { messageService } from "../../services/messageService";

const benefitRows = [
  [FiMessageCircle, "A 48-hour private window", "Up to 3 messages from you — a real back-and-forth, not a ticket."],
  [FiInbox, "Top of the priority inbox", "Your message appears above standard conversations so it cannot get lost."],
  [FiClock, "First reply within 48 hours", "A personal reply, usually much faster — within the guarantee."],
  [FiRefreshCw, "Refunded if unanswered", "No reply in 48 hours? Your coins come back automatically. Every time."],
];
const STAR = String.fromCharCode(10022);

export default function DirectAccessOfferModal({ onClose, profile }) {
  const navigate = useNavigate();
  const { startCall } = useCalls();
  const [pagePosition, setPagePosition] = useState(undefined);
  const creatorId = profile.ownerUserId;
  const firstName = profile.displayName?.split(" ")[0] || profile.username;
  const messageOffer = useQuery({
    queryKey: ["direct-access-offer", creatorId],
    queryFn: () => messageService.getDirectAccessOffer(creatorId).then((response) => response.data.data),
    retry: false,
  });
  const callOffer = useQuery({
    queryKey: ["paid-call-offer", creatorId],
    queryFn: () => callService.getPaidOffer(creatorId).then((response) => response.data.data),
    retry: false,
  });
  const offer = messageOffer.data;
  const paidCall = callOffer.data;

  useEffect(() => {
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setPagePosition({ "--direct-access-center-x": `${bounds.left + (bounds.width / 2)}px` });
    };
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("keydown", closeOnEscape);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("keydown", closeOnEscape);
      observer?.disconnect();
    };
  }, [onClose]);

  const openMessages = () => {
    onClose();
    navigate(`/messages?with=${encodeURIComponent(creatorId)}&directAccess=1`, {
      state: {
        directAccessOffer: offer,
        openDirectAccessOfferFor: String(creatorId),
      },
    });
  };
  const requestCall = (type = "AUDIO") => {
    onClose();
    startCall({ id: creatorId, displayName: profile.displayName, username: profile.username, avatarUrl: profile.avatar, role: "creator" }, type);
  };
  const replyHours = Math.max(1, Number(offer?.typicalReplyHours || 6));

  return <div className="direct-access-page-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={pagePosition}>
    <section aria-labelledby="direct-access-offer-title" aria-modal="true" className="direct-access-page" role="dialog">
      <header className="direct-access-page-header">
        <button aria-label="Close Direct Access" onClick={onClose} type="button"><FiArrowLeft /></button>
        <img alt="" src={profile.avatar || "/default-avatar.png"} />
        <span><h2 id="direct-access-offer-title">{profile.displayName} <i>✓</i></h2><small>Direct Access</small></span>
      </header>

      <main>
        <p className="direct-access-priority">🪶 World members get priority replies</p>
        <section className="direct-access-quote"><img alt="" src={profile.avatar || "/default-avatar.png"} /><span><strong>“Write as you are — I read everything myself.”</strong><small>{firstName} · Direct Access</small></span></section>

        <section className="direct-access-private-preview" aria-label="Recent private replies preview">
          <h3>Recent private replies</h3>
          <div><span className="is-right">You did you feel after you tried...</span><span>I honestly felt lost until I saw another...</span><i><FiLock /></i><span className="is-right">What would you tell someone who...</span><span>Stop waiting for the perfect moment and...</span><i><FiLock /></i></div>
          <p>Private stays private — yours will look like this to everyone else</p>
          <footer><span>⚡ replies within {replyHours}h</span><span>🪙 98% warm calls</span><span>↪ 48h or refund</span></footer>
        </section>

        {callOffer.isLoading ? <div className="direct-access-call is-loading" /> : paidCall?.enabled ? <section className="direct-access-call">
          <FiPhone />
          <span><strong>Call with {firstName}</strong><small>A real voice — just you and {firstName}</small><em>{STAR}{paidCall.priceStars} · {paidCall.durationMinutes} min · guaranteed or refunded</em></span>
          <button onClick={() => requestCall("AUDIO")} type="button">Request</button>
        </section> : null}

        <section className="direct-access-story">
          <div className="direct-access-spark">✦</div>
          <h3>A real conversation.</h3>
          <p>Not one reply into the void — a private 48-hour window with {firstName}, with a promise attached.</p>
        </section>

        <section className="direct-access-benefits">{benefitRows.map(([Icon, title, copy]) => <article key={title}><span><Icon /></span><div><h4>{title}</h4><p>{copy}</p></div></article>)}</section>

        {messageOffer.isError ? <p className="direct-access-error">{messageOffer.error?.response?.data?.message || "Direct Access is unavailable right now."}</p> : offer ? <section className="direct-access-price-card">
          <div><span>Price</span><b>{offer.premiumAllowance?.available ? "Included" : `${STAR}${offer.priceStars}`}</b></div>
          <div><span>Usually replies</span><b>within {replyHours}h</b></div>
          <div><span>Guarantee</span><b>48h or refunded</b></div>
        </section> : null}
        <p className="direct-access-charge-note">You’re only charged when {firstName} replies.</p>
      </main>

      <footer className="direct-access-unlock">
        <button disabled={messageOffer.isLoading || !offer?.enabled} onClick={openMessages} type="button">{offer?.premiumAllowance?.available ? "Open Direct Access" : "Unlock Direct Access"}</button>
        {offer && !offer.premiumAllowance?.available && Number(offer.walletBalance || 0) < Number(offer.priceStars) ? <button className="is-wallet" onClick={() => { onClose(); navigate("/fan/wallet"); }} type="button">Not enough Stars · Open Wallet</button> : null}
      </footer>
    </section>
  </div>;
}
