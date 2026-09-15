import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiChevronUp, FiEye, FiGift, FiSend, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ShareSheet from "../share/ShareSheet";
import StoryGiftPicker from "../stories/StoryGiftPicker";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
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
  const [replyText, setReplyText] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const name = displayName(card);
  const first = firstName(card);
  const route = profileRoute(card);
  const imageUrl = resolveMediaUrl(card?.coverImage || card?.media?.url || card?.creator?.cover || card?.avatar);
  const avatar = resolveMediaUrl(card?.avatar || card?.creator?.avatar);
  const place = placeLabel(card);
  const detail = card?.dream?.title || card?.dream?.text || card?.quote || card?.recommendationReason || card?.reason?.detail || "";
  const caption = storyLine(card);
  const statusMeta = [card?.category || card?.creator?.status || "Creator", place].filter(Boolean).join(" - ");
  const following = Boolean(card?.following ?? card?.isFollowing ?? card?.actions?.following ?? card?.creator?.following);
  const progressItems = useMemo(() => Array.from({ length: Math.max(1, total) }), [total]);
  const creatorId = card?.creator?.id || card?.id;
  const username = card?.username || card?.creator?.username;
  const replyMutation = useMutation({
    mutationFn: (body) => messageService.send(creatorId, body, null, crypto.randomUUID()),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast(`Message sent to ${first}.`);
    },
    onError: (error) => showToast(error?.response?.data?.message || "Message could not be sent."),
  });
  const seeYouMutation = useMutation({
    mutationFn: () => profileService.toggleSeeSignal(username),
    onSuccess: () => showToast(`I SEE YOU sent to ${first}.`),
    onError: (error) => showToast(error?.response?.data?.message || "I SEE YOU could not be sent."),
  });
  const sharePayload = {
    contentId: creatorId,
    contentType: "profile",
    imageUrl,
    previewText: detail || caption,
    route,
    title: `${name}'s profile`,
  };

  const submitReply = (event) => {
    event.preventDefault();
    const body = replyText.trim();
    if (!body) {
      setShareOpen(true);
      return;
    }
    if (creatorId && !replyMutation.isPending) replyMutation.mutate(body);
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

      <div className="discover-rec-story-copy">
        {detail ? (
          <div className="discover-rec-story-context">
            <span>Happening now</span>
            <strong>&quot;{detail}&quot;</strong>
          </div>
        ) : null}
        <h2>{caption}</h2>
        <button className="discover-rec-story-profile" onClick={openProfile} type="button">
          <FiChevronUp aria-hidden="true" />
          <span>Profile</span>
        </button>
        <small>{position} / {Math.max(1, total)}</small>
      </div>
      <form className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-3.5 right-3.5 z-40 flex items-center gap-2 rounded-[28px] bg-black/25 p-1.5 backdrop-blur-sm" onClick={(event) => event.stopPropagation()} onSubmit={submitReply}>
        <input aria-label={`Reply to ${first}`} className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/80" maxLength={1000} onChange={(event) => setReplyText(event.target.value)} placeholder={`Reply to ${first}...`} value={replyText} />
        <button aria-label="Send a gift" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white" onClick={() => setGiftOpen(true)} type="button"><FiGift /></button>
        <button aria-label="Send I see you" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white disabled:opacity-45" disabled={!username || seeYouMutation.isPending} onClick={() => seeYouMutation.mutate()} type="button"><FiEye /></button>
        <button aria-label={replyText.trim() ? "Send reply" : "Share profile"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/45 bg-white/10 text-lg text-white disabled:opacity-45" disabled={replyMutation.isPending} type="submit"><FiSend /></button>
      </form>
      {giftOpen ? createPortal(<StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast(`Gift sent to ${first}.`)} recipient={{ id: creatorId, name, username, avatar }} sourceType="DIRECT" />, document.body) : null}
      {shareOpen ? createPortal(<ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} />, document.body) : null}
    </section>
  );
}

export default memo(DiscoverRecommendationStory);
