import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiEyeOff, FiFlag, FiGift, FiLink, FiMoreHorizontal, FiSend, FiUserMinus, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ShareSheet from "../share/ShareSheet";
import StoryGiftPicker from "../stories/StoryGiftPicker";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { storyService } from "../../services/storyService";
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

function DiscoverEyeMark() {
  return (
    <svg aria-hidden="true" className="discover-rec-story-eye-mark" viewBox="0 0 64 40">
      <path d="M4 20C12 9 21.6 4 32 4s20 5 28 16c-8 11-17.6 16-28 16S12 31 4 20Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.2" />
      <circle cx="32" cy="20" fill="currentColor" r="5.4" />
    </svg>
  );
}

function DiscoverRecommendationStory({
  card,
  followPending = false,
  onClose,
  onNext,
  onPrevious,
  position = 1,
  total: _total = 1,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [message, setMessage] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [menuBusy, setMenuBusy] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
  const recipientId = card?.creator?.id || card?.creator?._id || card?.userId || card?.ownerUserId || card?.creatorId || "";
  const username = card?.username || card?.creator?.username || "";
  const featuredSeen = card?.featuredSeen || card?.latestSeen || null;
  const featuredSeenId = featuredSeen?.id || featuredSeen?._id || "";
  const featuredSeenImage = resolveMediaUrl(featuredSeen?.coverImage || featuredSeen?.cover || imageUrl);
  const storyDraft = {
    caption: caption || `${name} on @seen`,
    imageUrl,
    sharedCard: {
      destinationRoute: route,
      imageUrl,
      kind: "profile",
      subtitle: statusMeta || "Tap to open",
      title: `${name} on @seen`,
    },
  };
  const sharePayload = {
    contentId: featuredSeenId || recipientId,
    contentType: featuredSeenId ? "seen" : "profile",
    imageUrl: featuredSeenId ? featuredSeenImage : imageUrl,
    previewText: featuredSeen?.category || caption,
    route: featuredSeen?.route || route,
    storyDraft,
    title: featuredSeen?.title || `${name} on @seen`,
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

  const reportProfile = async () => {
    if (!username || menuBusy) return;
    setMenuBusy("report");
    try {
      await profileService.reportProfile(username, { reason: "OTHER" });
      showToast("Report received. Thank you for helping keep @seen safe.");
      setMenuOpen(false);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not report this profile.");
    } finally {
      setMenuBusy("");
    }
  };

  const unfollowCreator = async () => {
    if (!recipientId || menuBusy) return;
    setMenuBusy("unfollow");
    try {
      await storyService.unfollowCreator(recipientId);
      await queryClient.invalidateQueries({ queryKey: ["discover"] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      showToast(`Unfollowed ${name}.`);
      onClose?.();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not unfollow this account.");
    } finally {
      setMenuBusy("");
    }
  };

  const hideCreatorStories = async () => {
    if (!recipientId || menuBusy) return;
    setMenuBusy("hide");
    try {
      await storyService.hideCreatorStoriesById(recipientId);
      await queryClient.invalidateQueries({ queryKey: ["discover"] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      showToast(`Stories from ${name} are now hidden.`);
      onClose?.();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not hide these stories.");
    } finally {
      setMenuBusy("");
    }
  };

  const copyProfileLink = async () => {
    if (menuBusy) return;
    setMenuBusy("copy");
    try {
      const url = typeof window === "undefined" ? route : `${window.location.origin}${route}`;
      await navigator.clipboard.writeText(url);
      showToast("Link copied.");
      setMenuOpen(false);
    } catch {
      showToast("Could not copy this link.");
    } finally {
      setMenuBusy("");
    }
  };

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
        <div
          className="discover-rec-story-menu-wrap"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <button
            aria-expanded={menuOpen}
            aria-label="Open story menu"
            className="discover-rec-story-more"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <FiMoreHorizontal aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="story-viewer-more-menu discover-rec-story-more-menu">
              <button className="story-viewer-more-menu-item is-report" disabled={Boolean(menuBusy)} onClick={reportProfile} type="button"><FiFlag /> <span>{menuBusy === "report" ? "Reporting..." : "Report"}</span></button>
              <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy) || followPending || !following} onClick={unfollowCreator} type="button"><FiUserMinus /> <span>{menuBusy === "unfollow" ? "Unfollowing..." : "Unfollow"}</span></button>
              <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy)} onClick={hideCreatorStories} type="button"><FiEyeOff /> <span>{menuBusy === "hide" ? "Hiding..." : "Hide stories"}</span></button>
              <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy)} onClick={copyProfileLink} type="button"><FiLink /> <span>Copy link</span></button>
            </div>
          ) : null}
        </div>
        <button aria-label="Close discover story" className="discover-rec-story-close" onClick={onClose} type="button">
          <FiX aria-hidden="true" />
        </button>
      </header>

      <form className="discover-rec-story-actions" onSubmit={sendMessage}>
        <input aria-label={`Message ${first}`} disabled={messageMutation.isPending} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder={`Reply to ${first}...`} value={message} />
        <button aria-label={`Send a gift to ${first}`} disabled={!recipientId} onClick={() => setGiftOpen(true)} type="button"><FiGift aria-hidden="true" /></button>
        <button aria-label={`Let ${first} know you saw them`} className={seenMutation.isSuccess ? "is-active" : ""} disabled={!username || seenMutation.isPending} onClick={() => seenMutation.mutate()} type="button"><DiscoverEyeMark /></button>
        <button aria-label={message.trim() ? `Send message to ${first}` : `Share ${first}'s profile`} disabled={messageMutation.isPending} onClick={message.trim() ? undefined : () => setShareOpen(true)} type={message.trim() ? "submit" : "button"}><FiSend aria-hidden="true" /></button>
      </form>
    </section>
    {giftOpen ? <StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast(`Gift sent to ${first}.`)} recipient={{ id: recipientId, name }} sourceType="DIRECT" /> : null}
    {shareOpen ? <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} /> : null}
    </>
  );
}

export default memo(DiscoverRecommendationStory);
