import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiLock, FiMessageCircle, FiX } from "react-icons/fi";
import { messageService } from "../../services/messageService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

export default function PremiumWelcomeSheet({ onClose, publication }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creator = publication?.creator || {};
  const creatorId = creator.id || creator._id;
  const creatorName = creator.name || creator.displayName || creator.username || "the creator";
  const firstName = creatorName.trim().split(/\s+/)[0];
  const chapterCount = publication?.chapters?.length || 0;

  const openIncludedChat = async () => {
    if (!creatorId || busy) return;
    setBusy(true);
    setError("");
    try {
      const offer = await messageService.getDirectAccessOffer(creatorId).then((response) => response.data.data);
      let windowId = offer.activeWindow?.id;
      if (!windowId) {
        const opened = await messageService.openDirectAccessWindow(
          creatorId,
          createIdempotencyKey("premium-welcome-direct-access"),
          "PREMIUM_INCLUDED",
        );
        windowId = opened.data.data.window?.id;
      }
      onClose?.();
      navigate(`/messages?with=${encodeURIComponent(creatorId)}${windowId ? `&window=${encodeURIComponent(windowId)}` : ""}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Your included chat could not be opened. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="premium-welcome-backdrop" role="presentation">
      <section aria-labelledby="premium-welcome-title" aria-modal="true" className="premium-welcome-sheet" role="dialog">
        <div className="premium-welcome-handle" />
        <button aria-label="Close welcome" className="premium-welcome-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
        <div className="premium-welcome-planet" aria-hidden="true">🪐</div>
        <h2 id="premium-welcome-title">You&apos;re inside</h2>
        <p>You subscribed to {creatorName}&apos;s Premium Planet</p>

        <div className="premium-welcome-access-list">
          <button onClick={openIncludedChat} type="button">
            <FiMessageCircle />
            <span><b>Direct Access to {firstName}</b><small>A private window is ready · 3 messages / 48h · included this month</small></span>
            <strong>OPEN ›</strong>
          </button>
          <div><span aria-hidden="true">🪐</span><span><b>“{publication?.title || "The Inner Room"}”</b><small>All {chapterCount || "Premium"} chapters unlocked</small></span><FiCheck /></div>
          <div><FiLock /><span><b>Private stories &amp; highlights</b><small>Members only — fans never see these</small></span><FiCheck /></div>
        </div>

        {error ? <p aria-live="assertive" className="premium-welcome-error">{error}</p> : null}
        <button className="premium-welcome-say-hi" disabled={busy} onClick={openIncludedChat} type="button">
          {busy ? "Opening your private window…" : `Say hi to ${firstName} 💬`}
        </button>
        <small className="premium-welcome-renewal">Renews monthly · cancel anytime</small>
      </section>
    </div>
  );
}
