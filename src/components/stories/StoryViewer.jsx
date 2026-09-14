import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiCheck, FiEye, FiEyeOff, FiFlag, FiGift, FiLink, FiMoreHorizontal, FiPause, FiPlay, FiPlus, FiSend, FiTrash2, FiUserMinus, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useDeleteStory, useMarkStoryViewed } from "../../hooks/useStories";
import { storyService } from "../../services/storyService";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { canCreateStory, canDeleteStory, canReplyToStory, canViewStoryInsights } from "../../utils/storyPermissions";
import StoryInsightsModal from "./StoryInsightsModal";
import StoryGiftPicker from "./StoryGiftPicker";
import ShareSheet from "../share/ShareSheet";

const IMAGE_DURATION_MS = 5000;
const VIEW_THRESHOLD_MS = 1000;
const REPORT_REASONS = ["Spam", "Harassment or bullying", "Hate speech", "Nudity or sexual content", "Violence", "False information", "Something else"];

function formatStoryTimeAgo(value) {
  const created = new Date(value).getTime();
  if (!created) return "Now";

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

function StoryMedia({ muted, onDurationChange, onEnded, onPlay, story, videoRef }) {
  const transform = story.editorMetadata?.transform || {};
  const style = {
    transform: `translate(${transform.translateX || 0}%, ${transform.translateY || 0}%) scale(${transform.scale || 1}) rotate(${transform.rotation || 0}deg)`,
  };

  if (story.mediaType === "video") {
    return (
      <video
        autoPlay
        className="h-full w-full object-cover"
        muted={muted}
        onDurationChange={(event) => onDurationChange(Math.min(event.currentTarget.duration || story.duration || 60, 60))}
        onEnded={onEnded}
        onPlay={onPlay}
        playsInline
        ref={videoRef}
        src={story.mediaUrl}
        style={style}
      />
    );
  }

  return <img alt="" className="h-full w-full object-cover" src={story.mediaUrl || story.image} style={style} />;
}

function StoryOverlays({ story }) {
  const metadata = story.editorMetadata || {};
  return (
    <>
      {(metadata.textOverlays || []).map((overlay) => (
        <span
          className={`absolute max-w-[82%] rounded-xl px-3 py-1.5 text-center font-bold text-white ${
            overlay.background === "pill" ? "rounded-full bg-black/45" : overlay.background === "solid" ? "bg-black/65" : overlay.background === "translucent" ? "bg-black/30" : ""
          }`}
          key={overlay.id}
          style={{
            color: overlay.color || "#fff",
            fontSize: `${overlay.fontSize || 28}px`,
            fontWeight: overlay.fontWeight || 800,
            left: `${overlay.x || 50}%`,
            textAlign: overlay.align || "center",
            top: `${overlay.y || 50}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {overlay.text}
        </span>
      ))}
      {(metadata.stickers || []).map((sticker) => (
        <span
          className="absolute rounded-2xl bg-black/25 px-3 py-1.5 text-2xl backdrop-blur"
          key={sticker.id}
          style={{
            left: `${sticker.x || 50}%`,
            top: `${sticker.y || 50}%`,
            transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
          }}
        >
          {sticker.value}
        </span>
      ))}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 177.777">
        {(metadata.drawing || []).map((stroke) => (
          <polyline
            fill="none"
            key={stroke.id}
            points={(stroke.points || []).map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={stroke.color || "#8AB8FF"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke.size || 1.4}
          />
        ))}
      </svg>
    </>
  );
}

function StoryViewer({ initialIndex = 0, isOpen, onAddStory, onClose, presentation = "modal", stories = [] }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const viewedRef = useRef(new Set());
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(IMAGE_DURATION_MS);
  const [manualPaused, setManualPaused] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [systemPaused, setSystemPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [seeYouNotice, setSeeYouNotice] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [menuBusy, setMenuBusy] = useState("");
  const markViewedMutation = useMarkStoryViewed();
  const deleteMutation = useDeleteStory();
  const paused = manualPaused || holdPaused || systemPaused || ownerMenuOpen || insightsOpen || giftOpen || shareOpen;

  const activeStory = stories[index] || null;
  const canReply = canReplyToStory(user, activeStory);
  const canDelete = canDeleteStory(user, activeStory);
  const canViewInsights = canViewStoryInsights(user, activeStory);
  const canAdd = canCreateStory(user);
  const canAddToProfileMedia = canDelete && ["image", "video"].includes(activeStory?.mediaType);
  const replyMutation = useMutation({
    mutationFn: ({ body, storyId }) => storyService.replyToStory(storyId, body),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast("Reply sent to Messages.");
      onClose();
    },
    onError: (error) => showToast(error?.response?.data?.message || "Story reply could not be sent."),
  });
  const seeYouMutation = useMutation({
    mutationFn: ({ storyId }) => storyService.replyToStory(storyId, "I SEE YOU"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      setSeeYouNotice(true);
      window.setTimeout(() => setSeeYouNotice(false), 1300);
      showToast("I SEE YOU sent.");
    },
    onError: (error) => showToast(error?.response?.data?.message || "I SEE YOU could not be sent."),
  });
  const addToProfileMediaMutation = useMutation({
    mutationFn: ({ storyId }) => profileService.addStoryToProfileMedia(storyId).then((response) => response.data?.data),
    onSuccess: (_result, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ["profile-media"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      const markInCache = (current) => {
        if (!current) return current;
        const mark = (story) => story?.id === storyId ? { ...story, isInProfileMedia: true } : story;
        if (Array.isArray(current)) return current.map(mark);
        if (current.viewer?.stories) return { ...current, viewer: { ...current.viewer, stories: current.viewer.stories.map(mark) } };
        if (current.items) return { ...current, items: current.items.map((group) => ({ ...group, stories: (group.stories || []).map(mark) })) };
        return current;
      };
      queryClient.setQueriesData({ queryKey: ["stories"] }, markInCache);
      queryClient.setQueriesData({ queryKey: ["wall-stories"] }, markInCache);
      showToast("Added to Profile Media ✓");
      setOwnerMenuOpen(false);
    },
    onError: (error) => showToast(error?.response?.data?.message || "Story no longer available"),
  });

  const boundedIndex = useMemo(() => Math.max(0, Math.min(stories.length - 1, initialIndex)), [initialIndex, stories.length]);

  useEffect(() => {
    if (isOpen) {
      setIndex(boundedIndex);
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
      setReplyText("");
      setGiftOpen(false);
      setShareOpen(false);
      setReportMenuOpen(false);
      setMenuBusy("");
    }
  }, [boundedIndex, isOpen]);

  const goStory = useCallback((direction) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) return 0;
      if (next >= stories.length) {
        onClose();
        return current;
      }
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
      setReplyText("");
      setGiftOpen(false);
      setShareOpen(false);
      setReportMenuOpen(false);
      setMenuBusy("");
      return next;
    });
  }, [onClose, stories.length]);

  useEffect(() => {
    if (!isOpen || !activeStory) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (!viewedRef.current.has(activeStory.id)) {
        viewedRef.current.add(activeStory.id);
        markViewedMutation.mutate(activeStory.id);
      }
    }, VIEW_THRESHOLD_MS);

    return () => window.clearTimeout(timer);
  }, [activeStory, isOpen, markViewedMutation]);

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    setProgress(0);
    setDurationMs(activeStory.mediaType === "video" ? Math.min(Number(activeStory.duration) || 15, 60) * 1000 : IMAGE_DURATION_MS);
    return undefined;
  }, [activeStory]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goStory(1);
      if (event.key === "ArrowLeft") goStory(-1);
    };
    const pause = () => setSystemPaused(true);
    const resume = () => setSystemPaused(false);
    const onVisibility = () => setSystemPaused(document.hidden);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [goStory, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !activeStory || paused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 100 / (durationMs / 100));
        if (next >= 100 && activeStory.mediaType !== "video") {
          window.setTimeout(() => goStory(1), 0);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [activeStory, durationMs, goStory, isOpen, paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [activeStory, paused]);

  const deleteStory = () => {
    if (!activeStory || !canDelete || deleteMutation.isPending) {
      showToast("You do not have permission to delete this story.");
      return;
    }

    deleteMutation.mutate(activeStory.id, {
      onSuccess: () => {
        showToast("Story deleted.");
        onClose();
      },
      onError: (error) => {
        const status = error?.response?.status;
        showToast(status === 403 ? "You do not have permission to delete this story." : "Story could not be deleted.");
      },
    });
  };

  const addToProfileMedia = () => {
    if (!activeStory || !canAddToProfileMedia || activeStory.isInProfileMedia || addToProfileMediaMutation.isPending) return;
    addToProfileMediaMutation.mutate({ storyId: activeStory.id });
  };

  const submitReply = (event) => {
    event.preventDefault();
    const body = replyText.trim();
    if (!activeStory || !canReply || replyMutation.isPending) return;
    if (!body) {
      setShareOpen(true);
      return;
    }
    replyMutation.mutate({ body, storyId: activeStory.id });
  };

  const sendSeeYou = () => {
    if (!activeStory || !canReply || seeYouMutation.isPending) return;
    seeYouMutation.mutate({ storyId: activeStory.id });
  };

  const openGiftPicker = () => {
    if (!activeStory?.owner?.id && !activeStory?.ownerId) {
      showToast("This creator cannot receive direct gifts right now.");
      return;
    }
    setGiftOpen(true);
  };

  const copyStoryLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/stories/${activeStory.id}`);
      setOwnerMenuOpen(false);
      showToast("Story link copied.");
    } catch {
      showToast("Story link could not be copied.");
    }
  };

  const unfollowOwner = async () => {
    if (!activeStory.owner.username || menuBusy) return;
    setMenuBusy("unfollow");
    try {
      await profileService.toggleFollow(activeStory.owner.username);
      await queryClient.invalidateQueries({ queryKey: ["discover"] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast(`Unfollowed ${activeStory.owner.name}.`);
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not unfollow this account.");
    } finally {
      setMenuBusy("");
    }
  };

  const hideOwnerStories = async () => {
    const ownerId = activeStory.owner.id || activeStory.ownerId;
    if (!ownerId || menuBusy) return;
    setMenuBusy("hide");
    try {
      await messageService.muteConversation(ownerId, true);
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast(`Stories from ${activeStory.owner.name} are now hidden.`);
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not hide these stories.");
    } finally {
      setMenuBusy("");
    }
  };

  const reportStory = async (reason) => {
    if (menuBusy) return;
    setMenuBusy("report");
    try {
      await storyService.reportStory(activeStory.id, reason);
      showToast("Report received. Thank you for helping keep @seen safe.");
      setReportMenuOpen(false);
      setOwnerMenuOpen(false);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not report this story.");
    } finally {
      setMenuBusy("");
    }
  };

  if (!activeStory) {
    return null;
  }

  const inline = presentation === "inline";
  const replyName = (activeStory.owner.name || "Story").split(" ").filter(Boolean)[0] || "Story";
  const ownerProfileKey = activeStory.owner.username || activeStory.username || activeStory.owner.id || activeStory.ownerId;
  const ownerProfilePath = ownerProfileKey ? `/profile/${encodeURIComponent(ownerProfileKey)}` : null;
  const sharePayload = {
    contentId: activeStory.id,
    contentType: "story",
    imageUrl: activeStory.mediaUrl || activeStory.image || "",
    previewText: activeStory.caption || `Story from ${activeStory.owner.name}`,
    route: `/stories/${activeStory.id}`,
    title: `${activeStory.owner.name}'s story`,
  };
  const openOwnerProfile = (event) => {
    event.stopPropagation();
    if (ownerProfilePath) navigate(ownerProfilePath);
  };

  return (
    <>
      <FanModal
        className="story-viewer-dialog h-[100dvh] max-h-[100dvh] max-w-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none"
        hideHeader
        isOpen={isOpen}
        onClose={onClose}
        overlayClassName="story-viewer-overlay !p-0"
        portal
        title="Story viewer"
      >
        <div
          className={`story-viewer-surface relative h-[100dvh] overflow-hidden bg-black ${inline ? "discover-story-inline-surface" : ""}`}
          onPointerDown={() => setHoldPaused(true)}
          onPointerLeave={() => setHoldPaused(false)}
          onPointerUp={() => setHoldPaused(false)}
        >
          <StoryMedia
            muted={muted}
            onDurationChange={(duration) => setDurationMs(duration * 1000)}
            onEnded={() => goStory(1)}
            onPlay={() => setSystemPaused(false)}
            story={activeStory}
            videoRef={videoRef}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-atseen-bg/80 via-transparent to-atseen-bg/95" />
          <StoryOverlays story={activeStory} />
          <div className="absolute left-4 right-4 top-4 z-30 flex gap-1" role="group" aria-label="Story progress">
            {stories.map((story, storyIndex) => (
              <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30" key={story.id}>
                <span className="block h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${storyIndex < index ? 100 : storyIndex === index ? progress : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="absolute left-4 right-4 top-9 z-30 flex items-center gap-2.5">
            <button
              aria-label={`Open ${activeStory.owner.name || "story owner"} profile`}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              disabled={!ownerProfilePath}
              onClick={openOwnerProfile}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              type="button"
            >
              <FanAvatar brand={activeStory.brand} name={activeStory.owner.name} size="h-9 w-9" src={activeStory.owner.avatar} />
              <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-white">
                <span className="truncate">{activeStory.owner.name}</span>
                {activeStory.owner.verified ? <VerifiedBadge className="h-3.5 w-3.5 shrink-0" /> : null}
              </p>
              <p className="truncate text-[10px] font-semibold text-white/65">{formatStoryTimeAgo(activeStory.createdAt)}</p>
              </div>
            </button>
            <button
              aria-label={paused ? "Resume story" : "Pause story"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setManualPaused((current) => !current);
              }}
              type="button"
            >
              {paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
            </button>
            {activeStory.mediaType === "video" ? (
              <button
                aria-label={muted ? "Unmute story" : "Mute story"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                onClick={(event) => {
                  event.stopPropagation();
                  setMuted((current) => !current);
                }}
                type="button"
              >
                {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
              </button>
            ) : null}
            {canDelete || canViewInsights || canAdd ? (
              <div
                className="relative shrink-0"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <button
                  aria-label="Open story menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                  onClick={() => setOwnerMenuOpen((current) => !current)}
                  type="button"
                >
                  <FiMoreHorizontal aria-hidden="true" />
                </button>
                {ownerMenuOpen ? (
                  <div className="absolute right-0 top-11 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#111410]/95 p-1.5 text-sm shadow-[0_18px_50px_rgba(0,0,0,.7)] backdrop-blur-xl">
                    {canDelete ? <>
                      {canAddToProfileMedia ? <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-white hover:bg-white/10 disabled:cursor-default disabled:text-white/55" disabled={activeStory.isInProfileMedia || addToProfileMediaMutation.isPending} onClick={addToProfileMedia} type="button">{activeStory.isInProfileMedia ? <FiCheck /> : <FiPlus />} {activeStory.isInProfileMedia ? "Added to Profile Media ✓" : addToProfileMediaMutation.isPending ? "Adding..." : "Add to Profile Media"}</button> : null}
                      {canAdd ? <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-white hover:bg-white/10" onClick={onAddStory} type="button"><FiPlus /> Add another Story</button> : null}
                      {canViewInsights ? <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-white hover:bg-white/10" onClick={() => setInsightsOpen(true)} type="button"><FiBarChart2 /> View insights</button> : null}
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold text-atseen-danger hover:bg-atseen-danger/10" onClick={deleteStory} type="button"><FiTrash2 /> Delete Story</button>
                    </> : reportMenuOpen ? <>
                      <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-white/45">Why are you reporting this?</p>
                      {REPORT_REASONS.map((reason) => <button className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-white hover:bg-white/10 disabled:opacity-45" disabled={Boolean(menuBusy)} key={reason} onClick={() => reportStory(reason)} type="button">{reason}</button>)}
                      <button className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-atseen-blue hover:bg-white/10" onClick={() => setReportMenuOpen(false)} type="button">Back</button>
                    </> : <>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-bold text-rose-400 hover:bg-rose-400/10 disabled:opacity-45" disabled={Boolean(menuBusy)} onClick={() => setReportMenuOpen(true)} type="button"><FiFlag /> Report</button>
                      <button className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left font-bold text-white hover:bg-white/10 disabled:opacity-45" disabled={Boolean(menuBusy) || !activeStory.owner.username} onClick={unfollowOwner} type="button"><FiUserMinus /> {menuBusy === "unfollow" ? "Unfollowing…" : "Unfollow"}</button>
                      <button className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left font-bold text-white hover:bg-white/10 disabled:opacity-45" disabled={Boolean(menuBusy)} onClick={hideOwnerStories} type="button"><FiEyeOff /> {menuBusy === "hide" ? "Hiding…" : "Hide stories"}</button>
                      <button className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left font-bold text-white hover:bg-white/10 disabled:opacity-45" disabled={Boolean(menuBusy)} onClick={copyStoryLink} type="button"><FiLink /> Copy link</button>
                    </>}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button aria-label="Close story" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition hover:bg-black/45" onClick={onClose} type="button">
              <FiX aria-hidden="true" />
            </button>
          </div>
          {seeYouNotice ? (
            <div className="pointer-events-none absolute left-1/2 top-[74px] z-40 -translate-x-1/2 rounded-full bg-[#121721]/90 px-4 py-2 text-sm font-extrabold text-white shadow-2xl backdrop-blur">
              <span aria-hidden="true" className="mr-2">{"\ud83d\udc41\ufe0f"}</span>
              <span>{"\u2192"} {replyName}</span>
            </div>
          ) : null}
          {activeStory.caption ? <p className="absolute bottom-32 left-5 right-5 z-30 text-left text-base font-bold leading-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{activeStory.caption}</p> : null}
          {canReply ? (
            <form
              className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-3.5 right-3.5 z-40 flex items-center gap-2 rounded-[28px] bg-black/20 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onSubmit={submitReply}
            >
              <input
                aria-label="Reply to story"
                className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/50 px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/80 focus:bg-black/60 focus:ring-2 focus:ring-white/10"
                maxLength={1000}
                onBlur={() => setSystemPaused(false)}
                onChange={(event) => setReplyText(event.target.value)}
                onFocus={() => setSystemPaused(true)}
                placeholder={`Reply to ${replyName}...`}
                value={replyText}
              />
              <button
                aria-label="Send a gift"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 disabled:opacity-45"
                onClick={openGiftPicker}
                type="button"
              >
                <FiGift aria-hidden="true" />
              </button>
              <button
                aria-label="Send I see you"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 disabled:opacity-45"
                disabled={seeYouMutation.isPending}
                onClick={sendSeeYou}
                type="button"
              >
                <FiEye aria-hidden="true" />
              </button>
              <button
                aria-label={replyText.trim() ? "Send story reply" : "Share story in messages"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/45 bg-white/10 text-lg text-white shadow-[0_6px_18px_rgba(0,0,0,.3)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-45"
                disabled={replyMutation.isPending}
                type="submit"
              >
                <FiSend aria-hidden="true" />
              </button>
            </form>
          ) : null}
          <button aria-label="Previous story" className="absolute bottom-20 left-0 top-24 z-10 w-1/3 cursor-default opacity-0" disabled={index === 0} onClick={() => goStory(-1)} type="button" />
          <button aria-label="Next story" className="absolute bottom-20 right-0 top-24 z-10 w-2/3 cursor-default opacity-0" onClick={() => goStory(1)} type="button" />
        </div>
      </FanModal>
      <StoryInsightsModal isOpen={insightsOpen} onClose={() => setInsightsOpen(false)} story={activeStory} />
      {giftOpen ? createPortal((
        <StoryGiftPicker
          onClose={() => setGiftOpen(false)}
          onSent={() => showToast("Gift sent in Messages.")}
          recipient={{ ...activeStory.owner, id: activeStory.owner.id || activeStory.ownerId }}
        />
      ), document.body) : null}
      {shareOpen ? createPortal(
        <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} />,
        document.body
      ) : null}
    </>
  );
}

export default StoryViewer;
