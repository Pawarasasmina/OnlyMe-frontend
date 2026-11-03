import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiLock, FiMessageCircle, FiX } from "react-icons/fi";
import { messageService } from "../../services/messageService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

export default function PremiumWelcomeSheet({ onClose, publication }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creator = publication?.creator || {};
  const creatorId = creator.id || creator._id;
  const creatorName = creator.name || creator.displayName || creator.username || __msg("financial.theCreator");
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
      setError(requestError.response?.data?.message || __msg("financial.yourIncludedChatCouldNotBeOpenedPlease"));
      setBusy(false);
    }
  };

  return (
    <div className="premium-welcome-backdrop" role="presentation">
      <section aria-labelledby="premium-welcome-title" aria-modal="true" className="premium-welcome-sheet" role="dialog">
        <div className="premium-welcome-handle" />
        <button aria-label={__msg("financial.closeWelcome")} className="premium-welcome-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
        <div className="premium-welcome-planet" aria-hidden="true">🪐</div>
        <h2 id="premium-welcome-title">{__msg("financial.youReInside")}</h2>
        <p>{__msg("financial.youSubscribedTo")} {creatorName}{__msg("financial.sPremiumPlanet")}</p>

        <div className="premium-welcome-access-list">
          <button onClick={openIncludedChat} type="button">
            <FiMessageCircle />
            <span><b>{__msg("financial.directAccessTo_aa49e2")} {firstName}</b><small>{__msg("financial.aPrivateWindowIsReady3Messages48hIncluded")}</small></span>
            <strong>{__msg("financial.open")}</strong>
          </button>
          <div><span aria-hidden="true">🪐</span><span><b>“{publication?.title || __msg("financial.theInnerRoom")}”</b><small>{__msg("fanWeb.all")} {chapterCount || __msg("financial.premium")} {__msg("financial.chaptersUnlocked")}</small></span><FiCheck /></div>
          <div><FiLock /><span><b>{__msg("financial.privateStoriesHighlights")}</b><small>{__msg("financial.membersOnlyFansNeverSeeThese")}</small></span><FiCheck /></div>
        </div>

        {error ? <p aria-live="assertive" className="premium-welcome-error">{__systemMessage(error)}</p> : null}
        <button className="premium-welcome-say-hi" disabled={busy} onClick={openIncludedChat} type="button">
          {busy ? __msg("financial.openingYourPrivateWindow") : __msg("financial.sayHiTo", { value0: firstName })}
        </button>
        <small className="premium-welcome-renewal">{__msg("financial.renewsMonthlyCancelAnytime")}</small>
      </section>
    </div>
  );
}
