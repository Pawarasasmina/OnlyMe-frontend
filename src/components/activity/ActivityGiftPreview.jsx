/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";
import { FiGift } from "react-icons/fi";
import GiftArt from "../gifts/GiftArt";

export default function ActivityGiftPreview({ activity, onClose }) {
  __useUiLanguage();
  const closeButton = useRef(null);
  const [position, setPosition] = useState({});
  const [momentReady, setMomentReady] = useState(false);
  const [thanking, setThanking] = useState(false);
  const [thanked, setThanked] = useState(Boolean(activity.metadata?.thankedAt));
  const metadata = activity.metadata || {};
  const snapshot = activity.gift || metadata.gift || {};
  const giftId = snapshot.giftId || snapshot.id || metadata.giftId;
  const catalog = useQuery({
    queryKey: ["messages", "gifts", activity.relatedCreator?.id],
    queryFn: () => messageService.getGifts(activity.relatedCreator?.id).then((response) => response.data.data.gifts),
    enabled: Boolean(giftId),
    retry: false,
    staleTime: 60000,
  });
  const gift = { ...(catalog.data?.find((item) => String(item.id) === String(giftId)) || {}), ...snapshot };
  const name = metadata.giftName || gift.name || __msg("fan.gift");
  const imageUrl = resolveMediaUrl(metadata.giftImageUrl || gift.imageUrl || activity.giftImageUrl);
  const meaning = metadata.giftMeaning || metadata.giftDescription || gift.meaning || gift.description;
  const note = metadata.giftNote || metadata.giftMessage || gift.note;
  const sender = activity.relatedCreator || {};
  const from = activity.direction === "sent" ? "you" : sender.username ? `@${sender.username}` : sender.displayName || sender.name;

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const column = document.querySelector(".social-center-scroll");
    const update = () => {
      if (!column) return;
      const bounds = column.getBoundingClientRect();
      setPosition({ left: `${bounds.left}px`, width: `${bounds.width}px` });
    };
    update();
    const observer = column && typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (column) observer?.observe(column);
    window.addEventListener("resize", update);
    const keydown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
    };
    window.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => setMomentReady(true), 1800);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  const sayThanks = async (event) => {
    event.stopPropagation();
    const receiptId = metadata.giftReceiptId;
    if (!receiptId || thanking || thanked) return;
    setThanking(true);
    try {
      await profileService.thankReceivedGift(receiptId);
      setThanked(true);
    } finally {
      setThanking(false);
    }
  };

  return <div aria-label={__msg("activity.giftPreview", { value0: name })} aria-modal="true" className="activity-gift-preview" role="dialog" style={position}>
    <button aria-label={__msg("activity.closeGiftPreview")} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-xl text-white" onClick={onClose} ref={closeButton} type="button">×</button>
    <div className="activity-gift-preview-dismiss" onClick={onClose} role="presentation">
      <span className="activity-gift-preview-art">
        <i aria-hidden="true" />
        {imageUrl ? <GiftArt gift={gift} imageUrl={imageUrl} /> : <FiGift aria-label={name} />}
      </span>
      <span className="activity-gift-preview-info">
        <strong>{name}</strong>
        {meaning ? <span className="activity-gift-preview-meaning">{"\u201c"}{meaning}{"\u201d"}</span> : null}
        {from ? <small>{__msg("activity.from")} {from}</small> : null}
        {note ? <span className="activity-gift-preview-note">{"\u201c"}{note}{"\u201d"}</span> : null}
        {activity.direction === "received" && momentReady ? <button className="mt-4 rounded-full bg-atseen-blue px-5 py-2.5 text-xs font-black text-atseen-bg disabled:opacity-60" disabled={thanking || thanked || !metadata.giftReceiptId} onClick={sayThanks} type="button">{thanked ? "Thanks sent" : thanking ? "Sending…" : "Say thanks"}</button> : null}
      </span>
    </div>
  </div>;
}
