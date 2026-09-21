import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiEye, FiGift, FiSend, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ShareSheet from "../share/ShareSheet";
import StoryGiftPicker from "../stories/StoryGiftPicker";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { resolveMediaUrl } from "../../utils/media";

function displayName(card = {}) {
  return card.displayName || card.creator?.name || card.name || card.username || "Creator";
}

function firstName(card = {}) {
  return displayName(card).split(" ").filter(Boolean)[0] || "Creator";
}

function profileRoute(card = {}) {
  return card.profileUrl || card.creator?.profileRoute || (card.username || card.creator?.username ? `/profile/${encodeURIComponent(card.username || card.creator?.username)}` : "/search");
}

function placeLabel(card = {}) {
  return [card.city, card.country].filter(Boolean).join(", ") || card.location || [card.creator?.location?.city, card.creator?.location?.country].filter(Boolean).join(", ");
}

function storyLine(card = {}) {
  return card.creator?.status || card.status || card.recommendationReason || card.reason?.detail || card.category || "At seen";
}

function DiscoverRecommendationStory({
  card,
  followPending = false,
  onClose,
  onFollow,
  onNext,
  onPrevious,
  position = 1,
  total = 1,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [message, setMessage] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const name = displayName(card);
  const first = firstName(card);
  const route = profileRoute(card);
  const imageUrl = resolveMediaUrl(card?.coverImage || card?.media?.url || card?.creator?.cover || card?.avatar);
  const avatar = resolveMediaUrl(card?.avatar || card?.creator?.avatar);
  const place = placeLabel(card);
  const caption = storyLine(card);
  const statusMeta = [card?.category || card?.creator?.status || "Creator", place].filter(Boolean).join(" - ");
  const following = Boolean(card?.following ?? card?.isFollowing ?? card?.actions?.following ?? card?.creator?.following);
  const relatedStoryCount = Math.max(1, card?.stories?.length || 1);
  const progressItems = useMemo(() => Array.from({ length: relatedStoryCount }), [relatedStoryCount]);
  const recipientId = card?.id || card?.creator?.id || card?.creator?._id || "";
  const username = card?.username || card?.creator?.username || "";
  const sharePayload = {
    contentId: recipientId,
    contentType: "profile",
    imageUrl,
    previewText: caption,
    route,
    title: `${name} on @seen`,
  };
  const messageMutation = useMutation({
    mutationFn: (body) => messageService.send(recipientId, body, null, createIdempotencyKey("discover-story-message")),
    onError: (error) => showToast(error?.response?.data?.message || "Message could not be sent."),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast(`Message sent to ${first}.`);
    },
  });
  const seenMutation = useMutation({
    mutationFn: () => profileService.toggleSeeSignal(username),
    onError: (error) => showToast(error?.response?.data?.message || "Seen signal could not be sent."),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
      showToast(`${first} can now see that you saw them.`);
    },
  });

  const sendMessage = (event) => {
    event.preventDefault();
    const body = message.trim();
    if (!body || !recipientId || messageMutation.isPending) return;
    messageMutation.mutate(body);
  };

  const openProfile = useCallback((event) => {
    event.stopPropagation();
    navigate(route);
  }, [navigate, route]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key === "ArrowRight") onNext?.();
      if (event.key === "ArrowLeft") onPrevious?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrevious]);

  if (!card) return null;

  return (
    <>
    <section className="discover-rec-story" aria-label={`${name} discover story`}>
      {imageUrl ? <img alt="" className="discover-rec-story-media" src={imageUrl} /> : <span className="discover-rec-story-fallback" aria-hidden="true">{first.slice(0, 1)}</span>}
      <span className="discover-rec-story-shade" aria-hidden="true" />
      <button aria-label="Previous discovery" className="absolute bottom-20 left-0 top-20 z-[5] w-1/3 cursor-default opacity-0" onClick={onPrevious} type="button" />
      <button aria-label="Next discovery" className="absolute bottom-20 right-0 top-20 z-[5] w-2/3 cursor-default opacity-0" onClick={onNext} type="button" />

      <div className="discover-rec-story-progress" aria-label="Discover story position" role="group">
        {progressItems.map((_, index) => (
          <span className={index < position ? "is-filled" : ""} key={index} />
        ))}
      </div>

      <header className="discover-rec-story-head">
        <button className="discover-rec-story-identity" onClick={openProfile} type="button">
          <FanAvatar name={name} size="h-10 w-10" src={avatar} />
          <span className="min-w-0">
            <strong>{first}{card?.isVerified || card?.creator?.verified ? <VerifiedBadge className="ml-1 align-middle" /> : null}</strong>
            <small>{statusMeta}</small>
          </span>
        </button>
        <button
          className={`discover-rec-story-follow ${following ? "is-following" : ""}`}
          disabled={followPending}
          onClick={(event) => {
            event.stopPropagation();
            onFollow?.(card);
          }}
          type="button"
        >
          {following ? "Following" : "Follow"}
        </button>
        <button aria-label="Close discover story" className="discover-rec-story-close" onClick={onClose} type="button">
          <FiX aria-hidden="true" />
        </button>
      </header>

      <form className="discover-rec-story-actions" onSubmit={sendMessage}>
        <input aria-label={`Message ${first}`} disabled={messageMutation.isPending} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder={`Reply to ${first}...`} value={message} />
        <button aria-label={`Send a gift to ${first}`} disabled={!recipientId} onClick={() => setGiftOpen(true)} type="button"><FiGift aria-hidden="true" /></button>
        <button aria-label={`Let ${first} know you saw them`} className={seenMutation.isSuccess ? "is-active" : ""} disabled={!username || seenMutation.isPending} onClick={() => seenMutation.mutate()} type="button"><FiEye aria-hidden="true" /></button>
        <button aria-label={message.trim() ? `Send message to ${first}` : `Share ${first}'s profile`} disabled={messageMutation.isPending} onClick={message.trim() ? undefined : () => setShareOpen(true)} type={message.trim() ? "submit" : "button"}><FiSend aria-hidden="true" /></button>
      </form>
    </section>
    {giftOpen ? <StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast(`Gift sent to ${first}.`)} recipient={{ id: recipientId, name }} sourceType="DIRECT" /> : null}
    {shareOpen ? <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} /> : null}
    </>
  );
}

export default memo(DiscoverRecommendationStory);
