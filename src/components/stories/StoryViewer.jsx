import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiMoreHorizontal, FiPause, FiPlay, FiPlus, FiSend, FiTrash2, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useDeleteStory, useMarkStoryViewed, useReactToStory } from "../../hooks/useStories";
import { storyService } from "../../services/storyService";
import { canCreateStory, canDeleteStory, canReactToStory, canReplyToStory, canViewStoryInsights } from "../../utils/storyPermissions";
import StoryInsightsModal from "./StoryInsightsModal";
import StoryReactionTray from "./StoryReactionTray";

const IMAGE_DURATION_MS = 5000;
const VIEW_THRESHOLD_MS = 1000;
const REACTIONS_KEY = "atseen_story_reactions";

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

function readReactions() {
  try {
    return JSON.parse(localStorage.getItem(REACTIONS_KEY) || "{}");
  } catch {
    return {};
  }
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
  const [recentReaction, setRecentReaction] = useState(null);
  const [seeYouNotice, setSeeYouNotice] = useState(false);
  const [reactions, setReactions] = useState(readReactions);
  const [replyText, setReplyText] = useState("");
  const markViewedMutation = useMarkStoryViewed();
  const reactionMutation = useReactToStory();
  const deleteMutation = useDeleteStory();
  const paused = manualPaused || holdPaused || systemPaused || ownerMenuOpen || insightsOpen;

  const activeStory = stories[index] || null;
  const selectedReaction = activeStory ? reactions[activeStory.id]?.reaction || activeStory.viewerReaction : null;
  const canReact = canReactToStory(user, activeStory);
  const canReply = canReplyToStory(user, activeStory);
  const canDelete = canDeleteStory(user, activeStory);
  const canViewInsights = canViewStoryInsights(user, activeStory);
  const canAdd = canCreateStory(user);
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

  const boundedIndex = useMemo(() => Math.max(0, Math.min(stories.length - 1, initialIndex)), [initialIndex, stories.length]);

  useEffect(() => {
    if (isOpen) {
      setIndex(boundedIndex);
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
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

  const react = (reaction) => {
    if (!activeStory || !canReact || reactionMutation.isPending) {
      return;
    }

    setSystemPaused(true);
    reactionMutation.mutate(
      { reaction, storyId: activeStory.id },
      {
        onSuccess: () => {
          const next = { ...reactions, [activeStory.id]: { reaction, reactedAt: new Date().toISOString() } };
          localStorage.setItem(REACTIONS_KEY, JSON.stringify(next));
          setReactions(next);
          setRecentReaction(reaction);
          window.setTimeout(() => setRecentReaction(null), 700);
          showToast("Reaction sent.");
        },
        onError: (error) => {
          const status = error?.response?.status;
          showToast(status === 403 ? "You do not have permission to react to this story." : "Reaction could not be sent.");
        },
        onSettled: () => setSystemPaused(false),
      }
    );
  };

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

  const submitReply = (event) => {
    event.preventDefault();
    const body = replyText.trim();
    if (!activeStory || !canReply || !body || replyMutation.isPending) return;
    replyMutation.mutate({ body, storyId: activeStory.id });
  };

  const sendSeeYou = () => {
    if (!activeStory || !canReply || seeYouMutation.isPending) return;
    seeYouMutation.mutate({ storyId: activeStory.id });
  };

  if (!activeStory) {
    return null;
  }

  const inline = presentation === "inline";
  const replyName = (activeStory.owner.name || "Story").split(" ").filter(Boolean)[0] || "Story";
  const ownerProfileKey = activeStory.owner.username || activeStory.username || activeStory.owner.id || activeStory.ownerId;
  const ownerProfilePath = ownerProfileKey ? `/profile/${encodeURIComponent(ownerProfileKey)}` : null;
  const openOwnerProfile = (event) => {
    event.stopPropagation();
    if (ownerProfilePath) navigate(ownerProfilePath);
  };

  return (
    <>
      <FanModal
        className={`h-[100dvh] max-h-[100dvh] max-w-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none sm:h-auto sm:max-w-[440px] sm:rounded-[26px] ${inline ? "discover-story-inline-dialog" : ""}`}
        hideHeader
        isOpen={isOpen}
        onClose={onClose}
        overlayClassName={`${inline ? "discover-story-inline-overlay" : ""} p-0 sm:p-4`}
        title="Story viewer"
      >
        <div
          className={`relative h-[100dvh] overflow-hidden bg-black ${inline ? "discover-story-inline-surface" : "sm:h-[min(88vh,760px)] sm:rounded-[26px]"}`}
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
          {canDelete || canViewInsights || canAdd ? (
            <div
              className="absolute right-4 top-20 z-40"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button
                aria-label="Open story owner menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                onClick={(event) => {
                  event.stopPropagation();
                  setOwnerMenuOpen((current) => !current);
                }}
                type="button"
              >
                <FiMoreHorizontal aria-hidden="true" />
              </button>
              {ownerMenuOpen ? (
                <div className="mt-2 w-48 rounded-2xl border border-white/10 bg-[#0B0E13]/95 p-2 text-sm shadow-glow backdrop-blur">
                  {canAdd ? <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-white hover:bg-white/10" onClick={onAddStory} type="button"><FiPlus /> Add another Story</button> : null}
                  {canViewInsights ? <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-white hover:bg-white/10" onClick={() => setInsightsOpen(true)} type="button"><FiBarChart2 /> View insights</button> : null}
                  {canDelete ? <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-atseen-danger hover:bg-atseen-danger/10" onClick={deleteStory} type="button"><FiTrash2 /> Delete Story</button> : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {activeStory.caption ? <p className="absolute bottom-32 left-5 right-5 z-30 text-left text-base font-bold leading-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{activeStory.caption}</p> : null}
          {recentReaction ? <span aria-live="polite" className="pointer-events-none absolute bottom-32 left-1/2 z-30 -translate-x-1/2 animate-bounce text-5xl motion-reduce:animate-none">{recentReaction}</span> : null}
          {canReact || canReply ? (
            <div className={`absolute left-[22px] right-[22px] z-30 ${canReply ? "bottom-[78px]" : "bottom-[max(20px,env(safe-area-inset-bottom))]"}`}>
              <StoryReactionTray
                canSeeYou={canReply}
                canReact={canReact}
                onReact={react}
                pending={reactionMutation.isPending}
                onSeeYou={sendSeeYou}
                seeYouPending={seeYouMutation.isPending}
                selectedReaction={selectedReaction}
              />
            </div>
          ) : null}
          {canReply ? (
            <form
              className="absolute bottom-[max(26px,env(safe-area-inset-bottom))] left-3.5 right-3.5 z-40 flex gap-2.5"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onSubmit={submitReply}
            >
              <input
                aria-label="Reply to story"
                className="min-w-0 flex-1 rounded-full border border-white/35 bg-black/45 px-4 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/55 focus:border-white/70"
                maxLength={1000}
                onBlur={() => setSystemPaused(false)}
                onChange={(event) => setReplyText(event.target.value)}
                onFocus={() => setSystemPaused(true)}
                placeholder={`Reply to ${replyName}...`}
                value={replyText}
              />
              <button
                aria-label="Send story reply"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur disabled:opacity-45"
                disabled={!replyText.trim() || replyMutation.isPending}
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
    </>
  );
}

export default StoryViewer;
