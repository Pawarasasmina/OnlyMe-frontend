import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { messageService } from "../../services/messageService";
import { resolveMediaUrl } from "../../utils/media";
import { FiGift } from "react-icons/fi";

export default function ActivityGiftPreview({ activity, onClose }) {
  const closeButton = useRef(null);
  const [position, setPosition] = useState({});
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
  const name = metadata.giftName || gift.name || "Gift";
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
    const timer = window.setTimeout(onClose, 4200);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return <div aria-label={`${name} gift preview`} aria-modal="true" className="activity-gift-preview" role="dialog" style={position}>
    <button aria-label="Close gift preview" className="activity-gift-preview-dismiss" onClick={onClose} ref={closeButton} type="button">
      <span className="activity-gift-preview-art">
        <i aria-hidden="true" />
        {imageUrl ? <img alt={name} src={imageUrl} style={{ transform: `translate(${Number(gift.imagePositionX || metadata.giftImagePositionX || 0)}%, ${Number(gift.imagePositionY || metadata.giftImagePositionY || 0)}%) scale(${Number(gift.displayScale || metadata.giftDisplayScale || 100) / 100})` }} /> : <FiGift aria-label={name} />}
      </span>
      <span className="activity-gift-preview-info">
        <strong>{name}</strong>
        {meaning ? <span className="activity-gift-preview-meaning">{"\u201c"}{meaning}{"\u201d"}</span> : null}
        {from ? <small>from {from}</small> : null}
        {note ? <span className="activity-gift-preview-note">{"\u201c"}{note}{"\u201d"}</span> : null}
      </span>
    </button>
  </div>;
}
