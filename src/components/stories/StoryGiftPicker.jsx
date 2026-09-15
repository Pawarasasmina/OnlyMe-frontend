import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { messageService } from "../../services/messageService";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { GiftCelebration } from "../profile/ProfileDream";

const STAR = String.fromCharCode(10022);
const giftTransform = (gift) => `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})`;

export default function StoryGiftPicker({ onClose, onSent, recipient, sourceType = "STORY" }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
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

  const send = async (gift) => {
    if (sending || sent || !recipientId) return;
    setSending(gift.id);
    setError("");
    try {
      const direct = sourceType === "DIRECT";
      const response = await messageService.sendGift(recipientId, gift.id, createIdempotencyKey(direct ? "profile-direct-gift" : "story-direct-gift"), null, sourceType);
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
  return (
    <div className="dream-gift-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <section aria-label={sourceType === "DIRECT" ? "Send a direct gift" : "Send a story gift"} className="dream-gift-sheet">
        {sent ? <GiftCelebration gift={sent} message={`Gift sent to ${recipient?.name || "their activity"}`} /> : null}
        <span className="dream-gift-handle" />
        <div className="dream-gift-header">
          <div><h2>{sourceType === "DIRECT" ? "Send a direct gift" : "Send a story gift"}</h2><p>{sourceType === "DIRECT" ? "Send directly to" : "Send from this story to"} <strong>{recipient?.name || "this creator"}</strong></p></div>
          <button aria-label="Close gift picker" disabled={Boolean(sending)} onClick={onClose} type="button"><FiX /></button>
        </div>
        <p className="dream-gift-progress-copy">Your balance: <strong>{STAR}{walletQuery.isLoading ? "…" : balance.toLocaleString()}</strong></p>
        {giftsQuery.isLoading ? <p className="dream-gift-empty">Loading gifts…</p> : giftsQuery.isError ? <p className="dream-gift-empty">Gifts could not be loaded.</p> : (
          <div className="dream-gift-grid">
            {gifts.map((gift) => {
              const affordable = balance >= Number(gift.stars || 0);
              return <button className={`dream-gift-tile ${sending === gift.id ? "is-sending" : ""}`} disabled={Boolean(sending) || Boolean(sent) || walletQuery.isLoading || !affordable} key={gift.id} onClick={() => send(gift)} type="button">
                <span><img alt={gift.name} src={gift.imageUrl} style={{ transform: giftTransform(gift) }} /></span>
                <strong>{sending === gift.id ? "Sending..." : gift.name}</strong>
                <small>{STAR}{Number(gift.stars || 0).toLocaleString()}</small>
              </button>;
            })}
          </div>
        )}
        {error ? <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">{error}{error.toLowerCase().includes("insufficient") ? <Link className="ml-2 font-bold underline" to="/wallet">Open wallet</Link> : null}</div> : null}
      </section>
    </div>
  );
}
