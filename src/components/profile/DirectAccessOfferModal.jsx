import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiClock, FiInbox, FiLock, FiMessageCircle, FiPhone, FiRefreshCw } from "react-icons/fi";
import { useCalls } from "../../context/callContextBase";
import { callService } from "../../services/callService";
import { messageService } from "../../services/messageService";

const benefitRows = [
  __uiTuple([FiMessageCircle, { __uiMessage: "system.copy.795014181b4b" }, { __uiMessage: "profile.upTo3MessagesFromYouAReal" }]),
  __uiTuple([FiInbox, { __uiMessage: "profile.topOfThePriorityInbox" }, { __uiMessage: "profile.yourMessageAppearsAboveStandardConversationsSoIt" }]),
  __uiTuple([FiClock, { __uiMessage: "profile.firstReplyWithin48Hours" }, { __uiMessage: "profile.aPersonalReplyUsuallyMuchFasterWithinThe" }]),
  __uiTuple([FiRefreshCw, { __uiMessage: "profile.refundedIfUnanswered" }, { __uiMessage: "profile.noReplyIn48HoursYourCoinsCome" }]),
];
const CoinAmount = ({ value }) => <span className="inline-flex items-center gap-1 whitespace-nowrap"><img alt="coins" className="h-3.5 w-3.5 object-contain" src="/brand/goldcoin.png" />{value}</span>;

export default function DirectAccessOfferModal({ onClose, profile }) {
  __useUiLanguage();
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
    startCall({ id: creatorId, displayName: profile.displayName, username: profile.username, avatarUrl: profile.avatar, role: "creator" }, "AUDIO");
  };
  const replyHours = Math.max(1, Number(offer?.typicalReplyHours || 6));

  return <div className="direct-access-page-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={pagePosition}>
    <section aria-labelledby="direct-access-offer-title" aria-modal="true" className="direct-access-page" role="dialog">
      <header className="direct-access-page-header">
        <button aria-label={__msg("profile.closeDirectAccess")} onClick={onClose} type="button"><FiArrowLeft data-ui-directional="true" /></button>
        <img alt="" src={profile.avatar || "/default-avatar.png"} />
        <span><h2 dir="auto" id="direct-access-offer-title">{profile.displayName} <i>✓</i></h2><small>Direct Access</small></span>
      </header>

      <main>
        <p className="direct-access-priority">{__msg("profile.worldMembersGetPriorityReplies")}</p>
        <section className="direct-access-quote"><img alt="" src={profile.avatar || "/default-avatar.png"} /><span><strong>{__msg("profile.writeAsYouAreIReadEverythingMyself")}</strong><small>{firstName} {__msg("profile.directAccess")}</small></span></section>

        <section className="direct-access-private-preview" aria-label={__msg("profile.recentPrivateRepliesPreview")}>
          <h3>{__msg("profile.recentPrivateReplies")}</h3>
          <div><span className="is-right">{__msg("profile.youDidYouFeelAfterYouTried")}</span><span>{__msg("profile.iHonestlyFeltLostUntilISawAnother")}</span><i><FiLock /></i><span className="is-right">{__msg("profile.whatWouldYouTellSomeoneWho")}</span><span>{__msg("profile.stopWaitingForThePerfectMomentAnd")}</span><i><FiLock /></i></div>
          <p>{__msg("profile.privateStaysPrivateYoursWillLookLikeThisTo")}</p>
          <footer><span>{__msg("profile.repliesWithin")} {replyHours}{__msg("profile.h")}</span><span>{__msg("profile.98WarmCalls")}</span><span>{__msg("profile.48hOrRefund")}</span></footer>
        </section>

        {callOffer.isLoading ? <div className="direct-access-call is-loading" /> : paidCall?.enabled ? <section className="direct-access-call">
          <FiPhone />
          <span><strong>{__msg("profile.callWith")} {firstName}</strong><small>{__msg("profile.aRealVoiceJustYouAnd")} {firstName}</small><em><CoinAmount value={paidCall.priceStars} /> · {paidCall.durationMinutes} {__msg("profile.minGuaranteedOrRefunded")}</em></span>
          <button onClick={() => requestCall("AUDIO")} type="button">{__msg("profile.request")}</button>
        </section> : null}

        <section className="direct-access-story">
          <div className="direct-access-spark">✦</div>
          <h3>{__msg("profile.aRealConversation")}</h3>
          <p>{__msg("profile.notOneReplyIntoTheVoidAPrivate48")} {firstName}{__msg("profile.withAPromiseAttached")}</p>
        </section>

        <section className="direct-access-benefits">{benefitRows.map(([Icon, title, copy]) => <article key={title}><span><Icon /></span><div><h4>{title}</h4><p>{copy}</p></div></article>)}</section>

        {messageOffer.isError ? <p className="direct-access-error">{messageOffer.error?.response?.data?.message || __msg("profile.directAccessIsUnavailableRightNow")}</p> : offer ? <section className="direct-access-price-card">
          <div><span>{__msg("fan.price")}</span><b>{offer.premiumAllowance?.available ? __msg("profile.included") : <CoinAmount value={offer.priceStars} />}</b></div>
          <div><span>{__msg("profile.usuallyReplies")}</span><b>{__msg("profile.within")} {replyHours}{__msg("profile.h")}</b></div>
          <div><span>{__msg("profile.guarantee")}</span><b>{__msg("profile.48hOrRefunded")}</b></div>
        </section> : null}
        <p className="direct-access-charge-note">{__msg("profile.youReOnlyChargedWhen")} {firstName} {__msg("profile.replies")}</p>
      </main>

      <footer className="direct-access-unlock">
        <button disabled={messageOffer.isLoading || !offer?.enabled} onClick={openMessages} type="button">{offer?.premiumAllowance?.available ? __msg("profile.openDirectAccess") : __msg("profile.unlockDirectAccess")}</button>
        {offer && !offer.premiumAllowance?.available && Number(offer.walletBalance || 0) < Number(offer.priceStars) ? <button className="is-wallet" onClick={() => { onClose(); navigate("/fan/wallet"); }} type="button">{__msg("profile.notEnoughStarsOpenWallet")}</button> : null}
      </footer>
    </section>
  </div>;
}
