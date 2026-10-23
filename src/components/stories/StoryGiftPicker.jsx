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
import FanAvatar from "../fanWeb/shared/FanAvatar";

const STAR = String.fromCharCode(10022);
const giftTransform = (gift) => `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})`;

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

export default function StoryGiftPicker({ onClose, onSent, recipient, sourceType = "STORY" }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const backdropRef = useRef(null);
  const completionTimerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(completionTimerRef.current), []);
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState("EVERYONE");
  const sheetPosition = useGiftSheetPosition(backdropRef);
  const recipientId = recipient?.id;
  const giftsQuery = useQuery({
    queryKey: ["messages", "gifts", recipientId],
    queryFn: () => messageService.getGifts(recipientId).then((response) => response.data.data.gifts),
    enabled: Boolean(recipientId),
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
    if (sending || sent || !recipientId || !gift) return;
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
      completionTimerRef.current = window.setTimeout(() => {
        onClose();
        onSent?.(sentGift);
      }, 4200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send gift");
    } finally {
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
    : fromViewer ? "from you"
      : latestGift?.sender?.username ? `from @${latestGift.sender.username}` : "";

  const balance = Number(walletQuery.data?.balance || 0);
  const confirmGift = () => {
    if (balance < Number(selectedGift?.stars || 0)) {
      onClose();
      navigate("/wallet");
      return;
    }
    send();
  };
  const mostGifted = [...gifts].filter((gift) => gift.receivedCount > 0).sort((a, b) => b.receivedCount - a.receivedCount).slice(0, 4);
  const categories = gifts.reduce((groups, gift) => {
    const key = gift.category?.id || "other";
    if (!groups.has(key)) groups.set(key, { id: key, name: gift.category?.name || "Other gifts", sortOrder: gift.category?.sortOrder ?? 100000, gifts: [] });
    groups.get(key).gifts.push(gift);
    return groups;
  }, new Map());
  const sections = [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const giftTile = (gift) => {
    const affordable = balance >= Number(gift.stars || 0);
    return <button aria-label={`${gift.name}, ${Number(gift.stars || 0).toLocaleString()} coins${affordable ? "" : ", recharge required"}`} className={`dream-gift-tile ${selectedGift?.id === gift.id ? "is-selected" : ""} ${affordable ? "" : "is-unaffordable"}`} disabled={Boolean(sending) || Boolean(sent) || walletQuery.isLoading} key={gift.id} onClick={() => { setSelectedGift(gift); setError(""); }} type="button">
      <span><img alt={gift.name} src={gift.imageUrl} style={{ transform: giftTransform(gift) }} /></span>
      <strong>{sending === gift.id ? "Sending..." : gift.name}</strong>
      <small>{STAR}{Number(gift.stars || 0).toLocaleString()}</small>
    </button>;
  };
  return (
    <div className="dream-gift-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && !sent && onClose()} ref={backdropRef} style={sheetPosition}>
      {sent ? <GiftCelebration caption={sent.note} gift={sent} recipientName={String(recipient?.name || "them").split(" ")[0]} showSuccessToast={false} variant="is-profile-gift" /> : null}
      <section aria-label={sourceType === "DIRECT" ? "Send a direct gift" : "Send a story gift"} className="dream-gift-sheet">
        <span className="dream-gift-handle" />
        {!selectedGift ? <>
        <div className="dream-gift-header is-direct-profile-gift">
          <FanAvatar name={recipient?.name || "Creator"} size="h-8 w-8" src={recipient?.avatar} />
          <div><h2>Send {String(recipient?.name || "them").split(" ")[0]} a gift</h2><p>Gifts are direct support — {String(recipient?.name || "They").split(" ")[0]} earns from them instantly</p></div>
          <button aria-label="Close gift picker" disabled={Boolean(sending) || Boolean(sent)} onClick={onClose} type="button"><FiX /></button>
        </div>
        {latestGift ? <div className="dream-gift-recent" aria-label="Recent gift">
          <span className="dream-gift-recent-art"><img alt={latestGift.name} src={resolveMediaUrl(latestGift.imageUrl)} style={{ transform: giftTransform(latestGift) }} /></span>
          <p>{`Someone just made ${String(recipient?.name || "them").split(" ")[0]}\u2019s day \u2014 `}<strong>{latestGift.name}</strong>{latestSender ? ` \u00b7 ${latestSender}` : ""}</p>
        </div> : null}
        {giftsQuery.isLoading ? <p className="dream-gift-empty">Loading gifts…</p> : giftsQuery.isError ? <p className="dream-gift-empty">{giftsQuery.error?.response?.data?.message || "Gifts could not be loaded."}</p> : (
          <div className="dream-gift-sections">
            {mostGifted.length ? <section className="dream-gift-category"><h3>Most gifted</h3><div className="dream-gift-grid is-most-gifted">{mostGifted.map(giftTile)}</div></section> : null}
            {sections.map((section) => <section className="dream-gift-category" key={section.id}><h3>{section.name}</h3><div className="dream-gift-grid">{section.gifts.map(giftTile)}</div></section>)}
          </div>
        )}
        </> : <div className="dream-gift-confirm">
          <button className="dream-gift-change" disabled={Boolean(sending) || Boolean(sent)} onClick={() => setSelectedGift(null)} type="button">Change gift</button>
          <span className="dream-gift-confirm-image"><img alt={selectedGift.name} src={selectedGift.imageUrl} style={{ transform: giftTransform(selectedGift) }} /></span>
          <h2>{selectedGift.name}</h2>
          <small>to <strong>{recipient?.username ? `@${recipient.username}` : recipient?.name || "this creator"}</strong></small>
          <em>{STAR}{Number(selectedGift.stars || 0).toLocaleString()} · {recipient?.name || "They"} receives this as real earnings</em>
          <div className="dream-gift-arrival-note">{recipient?.name || "They"} sees it the moment it lands — first on the shelf</div>
          <button className="dream-gift-visibility" disabled={Boolean(sending) || Boolean(sent)} onClick={() => setVisibility((current) => current === "EVERYONE" ? "RECIPIENT_ONLY" : "EVERYONE")} type="button"><span>Visibility</span><b>{visibility === "EVERYONE" ? "Everyone" : "Only recipient"}</b><FiChevronRight aria-hidden="true" /></button>
          <label className="dream-gift-message"><span>Add a message · optional</span><input maxLength={500} disabled={Boolean(sending) || Boolean(sent)} onChange={(event) => setMessage(event.target.value)} placeholder="Say something..." value={message} /></label>
          <button className="dream-gift-send" disabled={Boolean(sending) || Boolean(sent)} onClick={confirmGift} type="button">{sending ? "Sending…" : balance < Number(selectedGift.stars || 0) ? <>Recharge · <span>{STAR}{Number(selectedGift.stars || 0).toLocaleString()}</span></> : <>Send gift · <span>{STAR}{Number(selectedGift.stars || 0).toLocaleString()}</span></>}</button>
          <p className="dream-gift-open-note">You’ll know the moment {recipient?.name || "they"} opens it ✦</p>
        </div>}
        {error ? <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">{error}{error.toLowerCase().includes("insufficient") ? <Link className="ml-2 font-bold underline" to="/wallet">Open wallet</Link> : null}</div> : null}
      </section>
    </div>
  );
}
