import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiChevronRight, FiX } from "react-icons/fi";
import { messageService } from "../../services/messageService";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { GiftCelebration } from "../profile/ProfileDream";

const STAR = String.fromCharCode(10022);
const giftTransform = (gift) => `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})`;

function useGiftSheetPosition() {
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    const centerColumn = document.querySelector(".social-center-scroll");
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
  }, []);

  return position;
}

export default function StoryGiftPicker({ onClose, onSent, recipient, sourceType = "STORY" }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState("EVERYONE");
  const sheetPosition = useGiftSheetPosition();
  const recipientId = recipient?.id;
  const giftsQuery = useQuery({
    queryKey: ["messages", "gifts", recipientId],
    queryFn: () => messageService.getGifts(recipientId).then((response) => response.data.data.gifts),
    enabled: Boolean(recipientId),
    staleTime: 60000,
  });
  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    retry: false,
  });

  const send = async () => {
    const gift = selectedGift;
    if (sending || sent || !recipientId) return;
    setSending(gift.id);
    setError("");
    try {
      const direct = sourceType === "DIRECT";
      const response = await messageService.sendGift(recipientId, gift.id, createIdempotencyKey(direct ? "profile-direct-gift" : "story-direct-gift"), null, sourceType, message, visibility);
      if (response.data.data?.wallet) queryClient.setQueryData(["wallet"], response.data.data.wallet);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] });
      setSent(gift);
      onSent?.(gift);
      window.setTimeout(onClose, 2600);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send gift");
    } finally {
      setSending("");
    }
  };

  const gifts = giftsQuery.data || [];
  const balance = Number(walletQuery.data?.balance || 0);
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
    return <button className={`dream-gift-tile ${selectedGift?.id === gift.id ? "is-selected" : ""}`} disabled={Boolean(sending) || Boolean(sent) || walletQuery.isLoading || !affordable} key={gift.id} onClick={() => { setSelectedGift(gift); setError(""); }} type="button">
      <span><img alt={gift.name} src={gift.imageUrl} style={{ transform: giftTransform(gift) }} /></span>
      <strong>{sending === gift.id ? "Sending..." : gift.name}</strong>
      <small>{STAR}{Number(gift.stars || 0).toLocaleString()}</small>
    </button>;
  };
  return (
    <div className="dream-gift-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()} style={sheetPosition}>
      <section aria-label={sourceType === "DIRECT" ? "Send a direct gift" : "Send a story gift"} className="dream-gift-sheet">
        {sent ? <GiftCelebration gift={sent} message={`Gift sent to ${recipient?.name || "their activity"}`} /> : null}
        <span className="dream-gift-handle" />
        {!selectedGift ? <>
        <div className="dream-gift-header">
          <div><h2>{sourceType === "DIRECT" ? "Send a direct gift" : "Send a story gift"}</h2><p>{sourceType === "DIRECT" ? "Send directly to" : "Send from this story to"} <strong>{recipient?.name || "this creator"}</strong></p></div>
          <button aria-label="Close gift picker" disabled={Boolean(sending)} onClick={onClose} type="button"><FiX /></button>
        </div>
        <p className="dream-gift-progress-copy">Your balance: <strong>{STAR}{walletQuery.isLoading ? "…" : balance.toLocaleString()}</strong></p>
        {giftsQuery.isLoading ? <p className="dream-gift-empty">Loading gifts…</p> : giftsQuery.isError ? <p className="dream-gift-empty">Gifts could not be loaded.</p> : (
          <div className="dream-gift-sections">
            {mostGifted.length ? <section className="dream-gift-category"><h3>Most gifted</h3><div className="dream-gift-grid is-most-gifted">{mostGifted.map(giftTile)}</div></section> : null}
            {sections.map((section) => <section className="dream-gift-category" key={section.id}><h3>{section.name}</h3><div className="dream-gift-grid">{section.gifts.map(giftTile)}</div></section>)}
          </div>
        )}
        </> : <div className="dream-gift-confirm">
          <button className="dream-gift-change" disabled={Boolean(sending)} onClick={() => setSelectedGift(null)} type="button">Change gift</button>
          <span className="dream-gift-confirm-image"><img alt={selectedGift.name} src={selectedGift.imageUrl} style={{ transform: giftTransform(selectedGift) }} /></span>
          <h2>{selectedGift.name}</h2>
          <p>“{message.trim() || "A gift chosen for you"}”</p>
          <small>for <strong>{recipient?.name || "this creator"}</strong> · {STAR}{Number(selectedGift.stars || 0).toLocaleString()}</small>
          <em>{recipient?.name || "They"} receives this as real earnings</em>
          <div className="dream-gift-arrival-note">{recipient?.name || "They"} sees it the moment it lands — first on the shelf</div>
          <button className="dream-gift-visibility" disabled={Boolean(sending)} onClick={() => setVisibility((current) => current === "EVERYONE" ? "RECIPIENT_ONLY" : "EVERYONE")} type="button"><span>Visibility</span><b>{visibility === "EVERYONE" ? "Everyone" : "Only recipient"}</b><FiChevronRight aria-hidden="true" /></button>
          <label className="dream-gift-message"><span>Add a message · optional</span><input maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="Say something..." value={message} /></label>
          <button className="dream-gift-send" disabled={Boolean(sending) || balance < Number(selectedGift.stars || 0)} onClick={send} type="button">{sending ? "Sending…" : <>Send gift · <span>{STAR}{Number(selectedGift.stars || 0).toLocaleString()}</span></>}</button>
          <p className="dream-gift-open-note">You’ll know the moment {recipient?.name || "they"} opens it ✦</p>
        </div>}
        {error ? <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">{error}{error.toLowerCase().includes("insufficient") ? <Link className="ml-2 font-bold underline" to="/wallet">Open wallet</Link> : null}</div> : null}
      </section>
    </div>
  );
}
