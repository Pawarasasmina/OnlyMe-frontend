import CoinIcon from "../branding/CoinIcon";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiChevronRight, FiX } from "react-icons/fi";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";
import { walletService } from "../../services/walletService";
import { useAuth } from "../../hooks/useAuth";
import { cacheSentProfileGift } from "../../utils/profileGifts";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { GiftCelebration } from "../profile/ProfileDream";
import GiftArt from "../gifts/GiftArt";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { useFanToast } from "../fanWeb/shared/FanToastContext";

const prototypeGiftCaption = (gift) => gift?.caption || gift?.tagline || gift?.description || ({
  "Explore More": "The world is waiting",
  Voltage: "Pure energy",
}[gift?.name] || "");

function useGiftSheetPosition(backdropRef) {
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    const centerColumn = backdropRef.current?.closest(".social-center-scroll")
      || document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({
        "--gift-sheet-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--gift-sheet-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [backdropRef]);

  return position;
}

export default function StoryGiftPicker({ landing = false, onClose, onSent, previewOnly = false, recipient, sourceType = "STORY" }) {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showGiftSequence } = useFanToast();
  const navigate = useNavigate();
  const backdropRef = useRef(null);
  const completionTimerRef = useRef(null);
  const sendLockRef = useRef(false);
  const sendStartedAtRef = useRef(0);
  useEffect(() => () => window.clearTimeout(completionTimerRef.current), []);
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [showAllLandingGifts, setShowAllLandingGifts] = useState(false);
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState("EVERYONE");
  const sheetPosition = useGiftSheetPosition(backdropRef);
  const recipientId = recipient?.id;
  const giftsQuery = useQuery({
    queryKey: previewOnly ? ["settings", "gifts", "fan-preview"] : ["messages", "gifts", recipientId],
    queryFn: () => previewOnly
      ? profileService.getGiftSettings().then((response) => response.data.data.gifts.filter((gift) => gift.enabled))
      : messageService.getGifts(recipientId).then((response) => response.data.data.gifts),
    enabled: previewOnly || Boolean(recipientId),
    retry: false,
    staleTime: 60000,
  });
  const receivedGiftsQuery = useQuery({
    queryKey: ["profile", "received-gifts", recipient?.username],
    queryFn: () => profileService.getReceivedGifts(recipient.username).then((response) => response.data.data),
    enabled: Boolean(recipient?.username),
    retry: false,
    staleTime: 30000,
  });
  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    retry: false,
  });

  const send = async () => {
    const gift = selectedGift;
    if (sendLockRef.current || sent || !recipientId || !gift) return;
    sendLockRef.current = true;
    sendStartedAtRef.current = Date.now();
    setSending(gift.id);
    setError("");
    try {
      const direct = sourceType === "DIRECT";
      const idempotencyKey = createIdempotencyKey(direct ? "profile-direct-gift" : "story-direct-gift");
      const response = await messageService.sendGift(recipientId, gift.id, idempotencyKey, null, sourceType, message, visibility);
      if (response.data.data?.wallet) queryClient.setQueryData(["wallet"], response.data.data.wallet);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] });
      const sentGift = { ...gift, ...(response.data.data?.gift || {}), note: message };
      cacheSentProfileGift(queryClient, {
        recipient, sender: user, gift: sentGift,
        receiptId: response.data.data?.receivedGift?.id || response.data.data?.message?.id || idempotencyKey,
        visibility, source: sourceType, message,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", "received-gifts"] });
      setSent(sentGift);
      const remainingAnimationMs = Math.max(0, 4200 - (Date.now() - sendStartedAtRef.current));
      completionTimerRef.current = window.setTimeout(() => {
        onClose();
        if (visibility === "EVERYONE") showGiftSequence(sentGift, recipient, () => navigate(`/profile/${recipient.username || recipient.id}`));
        onSent?.(sentGift);
      }, remainingAnimationMs);
    } catch (requestError) {
      const timedOut = requestError.code === "ECONNABORTED" || /timeout/i.test(requestError.message || "");
      setError(requestError.response?.data?.message || (timedOut ? "Gift confirmation took too long. Check your activity before trying again." : "The gift could not be sent. Please try again."));
    } finally {
      sendLockRef.current = false;
      setSending("");
    }
  };

  const gifts = giftsQuery.data || [];
  const latestGift = (receivedGiftsQuery.data?.gifts || []).reduce((latest, gift) => {
    const date = (item) => new Date(item?.createdAt || item?.receivedAt || 0).getTime() || 0;
    return !latest || date(gift) > date(latest) ? gift : latest;
  }, null);
  const fromViewer = latestGift && Boolean(
    (user?.id || user?._id) && String(latestGift.sender?.id || latestGift.sender?._id || "") === String(user.id || user._id)
  );
  const latestSender = latestGift?.visibility === "RECIPIENT_ONLY" ? ""
    : fromViewer ? __msg("stories.fromYou")
      : latestGift?.sender?.username ? `from @${latestGift.sender.username}` : "";

  const balance = Number(walletQuery.data?.balance || 0);
  const confirmGift = () => {
    if (!walletQuery.isSuccess) return;
    if (balance < Number(selectedGift?.stars || 0)) {
      onClose();
      navigate("/wallet");
      return;
    }
    send();
  };
  const mostGifted = [...gifts].filter((gift) => gift.receivedCount > 0).sort((a, b) => b.receivedCount - a.receivedCount).slice(0, 4);
  const categories = gifts.reduce((groups, gift) => {
    if (String(gift.category?.name || "").trim().toLowerCase() === "most gifted") return groups;
    const key = gift.category?.id || "other";
    if (!groups.has(key)) groups.set(key, { id: key, name: gift.category?.name || __msg("stories.otherGifts"), sortOrder: gift.category?.sortOrder ?? 100000, gifts: [] });
    groups.get(key).gifts.push(gift);
    return groups;
  }, new Map());
  const sections = [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const celebrationGift = sent || (sending && selectedGift ? { ...selectedGift, note: message } : null);
  const giftTile = (gift) => {
    const affordable = balance >= Number(gift.stars || 0);
    return <button aria-label={__msg("stories.coins", { value0: gift.name, value1: Number(gift.stars || 0).toLocaleString(__uiLocale()), value2: affordable ? "" : ", recharge required" })} className={`dream-gift-tile ${selectedGift?.id === gift.id ? "is-selected" : ""} ${affordable ? "" : "is-unaffordable"}`} disabled={Boolean(sending) || Boolean(sent) || walletQuery.isLoading} key={gift.id} onClick={() => { setSelectedGift(gift); setError(""); }} type="button">
      <span><GiftArt className="h-full w-full" gift={gift} imageClassName="h-full w-full" /></span>
      <strong>{sending === gift.id ? __msg("profile.sending") : gift.name}</strong>
      <small><CoinIcon />{Number(gift.stars || 0).toLocaleString(__uiLocale())}</small>
    </button>;
  };
  return (
    <div className="dream-gift-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && !sent && onClose()} ref={backdropRef} style={sheetPosition}>
      {celebrationGift ? <GiftCelebration caption={prototypeGiftCaption(celebrationGift)} gift={celebrationGift} note={celebrationGift.note} recipientName={String(recipient?.name || "them").split(" ")[0]} showSuccessToast={false} variant="is-profile-gift" /> : null}
      {!sent && !sending ? <section aria-label={sourceType === "DIRECT" ? __msg("stories.sendADirectGift") : __msg("stories.sendAStoryGift")} className={`dream-gift-sheet ${landing ? "is-gift-link-landing" : ""} ${selectedGift ? "has-gift-selection" : ""}`}>
        <span className="dream-gift-handle" />
        {!selectedGift ? landing ? <div className="gift-link-landing">
          <button aria-label={__msg("stories.closeGiftPicker")} className="gift-link-landing-close" onClick={onClose} type="button"><FiX /></button>
          <FanAvatar name={recipient?.name || "Creator"} size="h-24 w-24" src={recipient?.avatar} />
          <h2>Send {String(recipient?.name || "them").split(" ")[0]} a gift</h2>
          <p>@{recipient?.username || "creator"}</p>
          {giftsQuery.isLoading ? <p className="dream-gift-empty">{__msg("stories.loadingGifts")}</p> : giftsQuery.isError ? <p className="dream-gift-empty">{giftsQuery.error?.response?.data?.message || __msg("stories.giftsCouldNotBeLoaded")}</p> : <div className="gift-link-landing-grid">
            {(showAllLandingGifts ? gifts : gifts.slice(0, 5)).map((gift) => <button disabled={previewOnly} key={gift.id} onClick={() => { setSelectedGift(gift); setError(""); }} type="button"><span><GiftArt className="h-full w-full" gift={gift} imageClassName="h-full w-full" /></span><b>{gift.name}</b><small><CoinIcon />{Number(gift.stars || 0).toLocaleString(__uiLocale())}</small></button>)}
            {!showAllLandingGifts && gifts.length > 5 ? <button className="gift-link-all" onClick={() => setShowAllLandingGifts(true)} type="button"><span>＋</span><b>All gifts</b></button> : null}
          </div>}
          <small className="gift-link-landing-note">Your gift appears on {String(recipient?.name || "their").split(" ")[0]}’s profile with your name — or send it privately.</small>
        </div> : <>
        <div className="dream-gift-header is-direct-profile-gift">
          <FanAvatar name={recipient?.name || "Creator"} size="h-8 w-8" src={recipient?.avatar} />
          <div><h2>{__msg("fanWeb.send")} {String(recipient?.name || "them").split(" ")[0]} {__msg("stories.aGift")}</h2><p>{__msg("stories.giftsAreDirectSupport")} {String(recipient?.name || __msg("stories.they")).split(" ")[0]} {__msg("stories.earnsFromThemInstantly")}</p></div>
          <button aria-label={__msg("stories.closeGiftPicker")} disabled={Boolean(sending) || Boolean(sent)} onClick={onClose} type="button"><FiX /></button>
        </div>
        {latestGift ? <div className="dream-gift-recent" aria-label={__msg("stories.recentGift")}>
          <span className="dream-gift-recent-art"><GiftArt gift={latestGift} imageUrl={resolveMediaUrl(latestGift.imageUrl)} /></span>
          <p>{__msg("stories.someoneJustMadeSDay", { value0: String(recipient?.name || "them").split(" ")[0] })}<strong dir="auto">{latestGift.name}</strong>{latestSender ? ` \u00b7 ${latestSender}` : ""}</p>
        </div> : null}
        {giftsQuery.isLoading ? <p className="dream-gift-empty">{__msg("stories.loadingGifts")}</p> : giftsQuery.isError ? <p className="dream-gift-empty">{giftsQuery.error?.response?.data?.message || __msg("stories.giftsCouldNotBeLoaded")}</p> : (
          <div className="dream-gift-sections">
            {mostGifted.length ? <section className="dream-gift-category"><h3>{__msg("stories.mostGifted")}</h3><div className="dream-gift-grid is-most-gifted">{mostGifted.map(giftTile)}</div></section> : null}
            {sections.map((section) => <section className="dream-gift-category" key={section.id}><h3 dir="auto">{section.name}</h3><div className="dream-gift-grid">{section.gifts.map(giftTile)}</div></section>)}
          </div>
        )}
        </> : <div className="dream-gift-confirm">
          <button className="dream-gift-change" disabled={Boolean(sending) || Boolean(sent)} onClick={() => { setSelectedGift(null); setError(""); }} type="button">{__msg("stories.changeGift")}</button>
          <span className="dream-gift-confirm-image"><GiftArt className="h-full w-full" gift={selectedGift} imageClassName="h-full w-full" /></span>
          <h2 dir="auto">{selectedGift.name}</h2>
          {prototypeGiftCaption(selectedGift) ? <p className="dream-gift-caption">“{prototypeGiftCaption(selectedGift)}”</p> : null}
          <small>{__msg("profile.for")} <strong>{String(recipient?.name || recipient?.username || __msg("stories.thisCreator")).split(" ")[0]}</strong> · <CoinIcon />{Number(selectedGift.stars || 0).toLocaleString(__uiLocale())}</small>
          <em>{recipient?.name || __msg("stories.they")} {__msg("stories.receivesThisAsRealEarnings")}</em>
          <div className="dream-gift-arrival-note">{recipient?.name || __msg("stories.they")} {__msg("stories.seesItTheMomentItLandsFirstOnThe")}</div>
          <button aria-label={`${__msg("fan.visibility")}: ${visibility === "EVERYONE" ? __msg("onboarding.everyone") : __msg("stories.onlyRecipient")}`} className="dream-gift-visibility" disabled={Boolean(sending) || Boolean(sent)} onClick={() => setVisibility((current) => current === "EVERYONE" ? "RECIPIENT_ONLY" : "EVERYONE")} type="button"><span>{__msg("fan.visibility")}</span><b>{visibility === "EVERYONE" ? __msg("onboarding.everyone") : __msg("stories.onlyRecipient")}</b><FiChevronRight data-ui-directional="true" aria-hidden="true" /></button>
          <label className="dream-gift-message"><span>{__msg("stories.addAMessageOptional")}</span><input maxLength={500} disabled={Boolean(sending) || Boolean(sent)} onChange={(event) => setMessage(event.target.value)} placeholder={__msg("stories.saySomething")} value={message} /></label>
          <button className="dream-gift-send" disabled={Boolean(sending) || Boolean(sent) || !walletQuery.isSuccess} onClick={confirmGift} type="button">{sending ? <strong>{__msg("stories.sending")}</strong> : balance < Number(selectedGift.stars || 0) ? <><strong>{__msg("stories.recharge")}</strong> <span><CoinIcon />{Number(selectedGift.stars || 0).toLocaleString(__uiLocale())}</span></> : <><strong>{__msg("stories.sendGift")}</strong> <span><CoinIcon />{Number(selectedGift.stars || 0).toLocaleString(__uiLocale())}</span></>}</button>
          <p className="dream-gift-open-note">{__msg("stories.youLlKnowTheMoment")} {recipient?.name || __msg("stories.they_f1fdd4")} {__msg("stories.opensIt")}</p>
        </div>}
        {error ? <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">{__systemMessage(error)}{error.toLowerCase().includes("insufficient") ? <Link className="ms-2 font-bold underline" to="/wallet">{__msg("profile.openWallet")}</Link> : null}</div> : null}
      </section> : null}
    </div>
  );
}
