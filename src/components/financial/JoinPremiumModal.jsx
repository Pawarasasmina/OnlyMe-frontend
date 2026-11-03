import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiLock, FiMessageCircle, FiX } from "react-icons/fi";
import WalletBalance from "./WalletBalance";
import { walletService } from "../../services/walletService";
import { membershipService } from "../../services/membershipService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";

export default function JoinPremiumModal({ authenticated = true, onClose, onRequireAuth, open, publication, onSuccess }) {
  __useUiLanguage();
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewStory, setPreviewStory] = useState(null);
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    enabled: open && authenticated,
    retry: false,
  });

  useEffect(() => {
    if (open && !key) setKey(createIdempotencyKey("premium-join"));
    if (!open) {
      setKey("");
      setError("");
      setPreviewStory(null);
    }
  }, [key, open]);

  if (!open || !publication) return null;

  const offer = publication.membershipOffer || {};
  const price = Number(offer.regularPrice || publication.pricing?.starsAmount || 0);
  const introPrice = Number(offer.introPrice || 0);
  const chargePrice = introPrice && introPrice < price ? introPrice : price;
  const priceLabel = introPrice && introPrice < price ? __msg("financial.value0FirstMonthValue1MoAfter", { value0: introPrice, value1: price }) : `✦${price}/mo`;
  const creatorFirstName = publication.creator?.name?.trim().split(/\s+/)[0] || __msg("stories.thisCreator");
  const freeStories = (publication.chapters || [])
    .filter((chapter, index) => chapter.isPreview || index === 0)
    .flatMap((chapter) => (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, type: block.type, title: block.metadata?.label || chapter.title })))
    .slice(0, 4);

  const confirm = async () => {
    if (busy) return;
    if (!authenticated) {
      onRequireAuth?.();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await membershipService.joinPremiumWorld(publication.id, key);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["wallet"] }),
        client.invalidateQueries({ queryKey: ["memberships"] }),
        client.invalidateQueries({ queryKey: ["world", publication.id] }),
        client.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      const result = response.data.data;
      if (result.queued) {
        setError(__msg("financial.youReOnTheWaitingListIsReservedAnd", { value0: result.waitingList?.position || 1, value1: result.waitingList?.heldStars || chargePrice }));
        setKey("");
      } else {
        await onSuccess?.(result.membership);
      }
    } catch (requestError) {
      const code = financialErrorCode(requestError);
      if (code === "MEMBERSHIP_ALREADY_ACTIVE") {
        await onSuccess?.();
      } else if (code === "INSUFFICIENT_STARS") {
        const short = Math.max(0, chargePrice - Number(wallet.data?.balance || 0));
        setError(__msg("financial.youNeedMoreStarsAddStarsToYourWallet", { value0: short }));
      } else {
        setError(financialErrorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="premium-join-page">
      <section className="premium-join-card">
        <button aria-label={__msg("financial.closeUnlockPage")} className="premium-join-close" onClick={onClose} type="button"><FiX /></button>
        <div className="premium-join-hero">
          {publication.coverMedia?.secureUrl ? <img alt="" src={publication.coverMedia.secureUrl} /> : null}
          <div />
        </div>
        <div className="premium-join-content">
          <small>{__msg("financial.premiumPlanet")}</small>
          <h2 dir="auto">{publication.title}</h2>
          <p>{__msg("financial.youUnlockEverythingAbout")} {creatorFirstName}.</p>
          {freeStories.length ? <section className="premium-join-previews" aria-label={__msg("financial.freeStories")}><h3>{__msg("financial.freeStories")} <span>{__msg("financial.tapToPreview")}</span></h3><div>{freeStories.map((story, index) => <button aria-label={__msg("financial.preview", { value0: story.title || __msg("financial.freeStoryValue0", { value0: index + 1 }) })} key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => setPreviewStory(story)} type="button">{story.type === "VIDEO" ? <video muted playsInline preload="metadata" src={story.secureUrl} /> : <img alt={story.title || __msg("financial.freeStory", { value0: index + 1 })} loading="lazy" src={story.secureUrl} />}</button>)}</div></section> : null}
          <div className="premium-join-benefits">
            <span><FiMessageCircle /><b>{__msg("financial.directAccessTo")} {creatorFirstName}{__msg("financial.sPrivateWorld")}</b></span>
            <span><FiCheck /><b>{__msg("financial.privateRepliesFrom")} {creatorFirstName}{__msg("financial.guaranteed")}</b></span>
            <span><span>🪐</span><b>{__msg("financial.everyPremiumChapterAlwaysNew")}</b></span>
            <span><FiLock /><b>{__msg("financial.privateStoriesAndHighlights")}</b></span>
          </div>
          {authenticated ? <div className="premium-join-balance"><span>{__msg("financial.yourBalance")}</span><WalletBalance /></div> : null}
          {error ? <p aria-live="assertive" className="premium-join-error">{__systemMessage(error)}</p> : null}
          <button className="premium-join-confirm" disabled={busy || (authenticated && (wallet.isError || wallet.isLoading))} onClick={confirm} type="button">
            {!authenticated ? __msg("financial.signInToUnlock") : busy ? __msg("financial.confirming") : __msg("financial.unlockEverything", { value0: priceLabel })}
          </button>
          <p className="premium-join-terms">{__msg("financial.renewsAutomaticallyEvery30DaysUsingStarsCancelAnytime")}</p>
        </div>
      </section>
      {previewStory ? (
        <div aria-label={__msg("financial.freeStoryPreview")} aria-modal="true" className="premium-free-story-viewer" onClick={() => setPreviewStory(null)} role="dialog">
          <button aria-label={__msg("financial.closeFreeStoryPreview")} onClick={() => setPreviewStory(null)} type="button"><FiX /></button>
          {previewStory.type === "VIDEO"
            ? <video autoPlay controls playsInline src={previewStory.secureUrl} onClick={(event) => event.stopPropagation()} />
            : <img alt={previewStory.title || __msg("financial.freeStoryPreview")} src={previewStory.secureUrl} onClick={(event) => event.stopPropagation()} />}
          <strong>{previewStory.title || __msg("financial.freeStory_08143b")}</strong>
        </div>
      ) : null}
    </main>
  );
}
