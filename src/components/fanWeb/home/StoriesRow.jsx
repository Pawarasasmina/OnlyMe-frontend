import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiImage,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUpload,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import AtseenLogo from "../../branding/AtseenLogo";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import LoadingSkeleton from "../shared/LoadingSkeleton";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { storyService } from "../../../services/storyService";
import { canCreateStory, canDeleteStory } from "../../../utils/storyPermissions";

const MAX_STORY_SIZE = 8 * 1024 * 1024;
const STORY_DURATION_MS = 6500;
const VIEW_THRESHOLD_MS = 900;
const SEEN_KEY = "atseen_seen_stories";
const REACTIONS_KEY = "atseen_story_reactions";
const QUICK_REACTIONS = [
  { label: "heart", value: "❤️" },
  { label: "fire", value: "🔥" },
  { label: "applause", value: "👏" },
  { label: "laugh", value: "😂" },
  { label: "surprise", value: "😮" },
  { label: "spark", value: "✦" },
];

function readStoredMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function StoryMedia({ muted, story }) {
  if (story.mediaType === "video") {
    return (
      <video
        autoPlay
        className="h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        src={story.image}
      />
    );
  }

  return <img alt="" className="h-full w-full object-cover" src={story.image} />;
}

function StoriesRow({ currentUser }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const fileInputRef = useRef(null);
  const viewedThisSessionRef = useRef(new Set());
  const [activeIndex, setActiveIndex] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [caption, setCaption] = useState("");
  const [seen, setSeen] = useState(() => readStoredMap(SEEN_KEY));
  const [reactions, setReactions] = useState(() => readStoredMap(REACTIONS_KEY));
  const [recentReaction, setRecentReaction] = useState(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const canCreate = canCreateStory(user);
  const queryClient = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ["stories", "active"],
    queryFn: storyService.getActiveStories,
    retry: false,
  });

  const activeStories = useMemo(() => {
    const remoteStories = Array.isArray(storiesQuery.data) ? storiesQuery.data : [];
    return remoteStories;
  }, [storiesQuery.data]);
  const activeStory = activeIndex == null ? null : activeStories[activeIndex];
  const activeStoryId = activeStory?.id;

  const viewMutation = useMutation({
    mutationFn: storyService.markStoryViewed,
    retry: false,
  });

  const reactionMutation = useMutation({
    mutationFn: ({ reaction, storyId }) => storyService.reactToStory(storyId, reaction),
    retry: false,
    onSuccess: (_data, { reaction, storyId }) => {
      setReactions((current) => {
        const next = {
          ...current,
          [storyId]: {
            reaction,
            reactedAt: new Date().toISOString(),
          },
        };
        localStorage.setItem(REACTIONS_KEY, JSON.stringify(next));
        return next;
      });
      setRecentReaction(reaction);
      window.setTimeout(() => setRecentReaction(null), 650);
      showToast("Reaction sent.");
    },
    onError: (error) => {
      const status = error?.response?.status;
      showToast(status === 403 ? "You do not have permission to react to this story." : "Reaction could not be sent.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => storyService.createStory(draft.file, caption.trim(), setProgress),
    onSuccess: async () => { closeUpload(); await queryClient.invalidateQueries({ queryKey: ["stories", "active"] }); showToast("Your story is live for 24 hours."); },
    onError: (error) => showToast(error.response?.data?.message || "Story could not be published."),
  });

  const deleteMutation = useMutation({
    mutationFn: (storyId) => storyService.deleteStory(storyId),
    onSuccess: async () => { setActiveIndex(null); await queryClient.invalidateQueries({ queryKey: ["stories", "active"] }); showToast("Story deleted."); },
    onError: () => showToast("Story could not be deleted."),
  });

  const clearDraft = useCallback((shouldRevoke = true) => {
    setDraft((current) => {
      if (shouldRevoke && current?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });
  }, []);

  const markSeenLocally = useCallback((storyId) => {
    setSeen((current) => {
      if (current[storyId]) {
        return current;
      }

      const next = { ...current, [storyId]: true };
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markSeen = useCallback((story) => {
    if (!story || user?.role !== "fan" || seen[story.id] || viewedThisSessionRef.current.has(story.id)) {
      return;
    }

    viewedThisSessionRef.current.add(story.id);
    markSeenLocally(story.id);
    viewMutation.mutate(story.id);
  }, [markSeenLocally, seen, user?.role, viewMutation]);

  const openStory = (index) => {
    setActiveIndex(index);
    setProgress(0);
    setPaused(false);
  };

  const openUpload = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for fan accounts.");
      return;
    }

    setUploadOpen(true);
    clearDraft();
    setCaption("");
  };

  const closeUpload = () => {
    setUploadOpen(false);
    clearDraft();
    setCaption("");
  };

  const chooseFile = (event) => {
    if (!canCreate) {
      event.target.value = "";
      showToast("Story publishing is not available for fan accounts.");
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Choose an image for your story.");
      return;
    }

    if (file.size > MAX_STORY_SIZE) {
      showToast("Story media must be under 8 MB for this web preview.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setDraft((current) => {
      if (current?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(current.url);
      }

      return {
        url: objectUrl,
        mediaType: "image",
        name: file.name,
        file,
      };
    });
  };

  const publishStory = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for fan accounts.");
      return;
    }

    if (!draft) {
      showToast("Add a photo or video first.");
      return;
    }

    publishMutation.mutate();
  };

  const deleteOwnStory = () => {
    if (!canDeleteStory(user, activeStory)) {
      showToast("You do not have permission to delete this story.");
      return;
    }

    deleteMutation.mutate(activeStory.id);
  };

  const closeStory = () => setActiveIndex(null);
  const goStory = useCallback((direction) => {
    setActiveIndex((current) => {
      if (current == null) {
        return current;
      }

      const next = Math.max(0, Math.min(activeStories.length - 1, current + direction));
      setProgress(0);
      return next;
    });
  }, [activeStories.length]);

  const reactToActiveStory = (reaction) => {
    if (!activeStory || reactionMutation.isPending) {
      return;
    }

    reactionMutation.mutate({ reaction, storyId: activeStory.id });
  };

  useEffect(() => {
    if (!canCreate && uploadOpen) {
      setUploadOpen(false);
      clearDraft();
      setCaption("");
    }
  }, [canCreate, clearDraft, uploadOpen]);

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    const timer = window.setTimeout(() => markSeen(activeStory), VIEW_THRESHOLD_MS);
    return () => window.clearTimeout(timer);
  }, [activeStory, markSeen]);

  useEffect(() => {
    if (!activeStoryId) {
      return undefined;
    }

    setProgress(0);
    setPaused(false);
    return undefined;
  }, [activeStoryId]);

  useEffect(() => {
    if (!activeStory || paused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + (100 / (STORY_DURATION_MS / 100)));
        if (next >= 100 && activeIndex < activeStories.length - 1) {
          window.setTimeout(() => goStory(1), 0);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [activeIndex, activeStories.length, activeStory, goStory, paused]);

  useEffect(() => {
    if (activeIndex == null) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        goStory(1);
      }
      if (event.key === "ArrowLeft") {
        goStory(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goStory]);

  const hasOwnStories = canCreate && activeStories.some((story) => story.isOwn);
  const selectedReaction = activeStory ? reactions[activeStory.id]?.reaction : null;

  if (storiesQuery.isLoading) {
    return (
      <div className="mt-[18px]" role="status">
        <LoadingSkeleton className="h-[86px]" count={1} />
      </div>
    );
  }

  if (storiesQuery.isError) {
    return (
      <div className="mt-[18px] rounded-2xl border border-atseen-danger/25 bg-atseen-danger/10 p-4">
        <p className="text-sm font-semibold text-atseen-danger">Unable to load Stories.</p>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2 text-xs font-bold text-atseen-text"
          onClick={() => storiesQuery.refetch()}
          type="button"
        >
          <FiRefreshCw aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  if (activeStories.length === 0 && !canCreate) {
    return (
      <div className="mt-[18px] rounded-2xl border border-atseen-line bg-atseen-surface p-4 text-sm font-semibold text-atseen-muted" role="status">
        No active Stories right now.
      </div>
    );
  }

  return (
    <>
      <div className="atseen-hide-scrollbar mt-[18px] flex gap-[18px] overflow-x-auto pb-1">
        {activeStories.map((story, index) => (
          <button
            aria-label={`View ${story.name}'s Story`}
            className="flex shrink-0 flex-col items-center text-center"
            key={story.id}
            onClick={() => openStory(index)}
            type="button"
          >
            <span
              className={`inline-flex rounded-full p-[2.5px] ${
                seen[story.id] ? "bg-white/15" : "bg-gradient-to-br from-atseen-blue to-atseen-blue-strong"
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-atseen-bg bg-atseen-bg-2">
                {story.brand ? <AtseenLogo iconOnly size={28} /> : <img alt="" className="h-full w-full object-cover" src={story.avatar || story.image} />}
              </span>
            </span>
            {story.statusEmoji ? (
              <span className="-mt-3 ml-7 inline-flex h-5 w-5 items-center justify-center rounded-full border border-atseen-blue/35 bg-atseen-bg text-[10px]">
                {story.statusEmoji}
              </span>
            ) : null}
            <span className="mt-1 flex max-w-16 items-center gap-1 truncate text-[10px] font-semibold text-atseen-muted">
              <span className="truncate">{story.name}</span>
              {story.verified ? <VerifiedBadge className="h-3 w-3 shrink-0" /> : null}
            </span>
          </button>
        ))}
        {canCreate ? (
          <button
            aria-label="Create Story"
            className="flex shrink-0 flex-col items-center text-center"
            onClick={openUpload}
            type="button"
          >
            <span
              className={`relative inline-flex h-[59px] w-[59px] items-center justify-center rounded-full border text-xl ${
                hasOwnStories
                  ? "border-atseen-blue/45 bg-atseen-blue/10 text-atseen-blue"
                  : "border-dashed border-white/25 text-atseen-dim"
              }`}
            >
              <FiPlus aria-hidden="true" />
              {hasOwnStories ? (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-atseen-bg bg-atseen-blue text-[12px] text-atseen-bg">
                  <FiPlus aria-hidden="true" />
                </span>
              ) : null}
            </span>
            <span className="mt-1 text-[10px] font-semibold text-atseen-dim">You</span>
          </button>
        ) : null}
      </div>

      {canCreate ? (
        <FanModal className="max-w-[430px] p-0 sm:p-0" isOpen={uploadOpen} onClose={closeUpload} title="Create story">
          <div className="grid gap-4">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[310px] overflow-hidden rounded-[24px] border border-atseen-line bg-atseen-bg">
              {draft ? (
                draft.mediaType === "video" ? (
                  <video autoPlay className="h-full w-full object-cover" loop muted playsInline src={draft.url} />
                ) : (
                  <img alt="" className="h-full w-full object-cover" src={draft.url} />
                )
              ) : (
                <button
                  className="flex h-full w-full flex-col items-center justify-center gap-3 text-atseen-muted transition hover:text-atseen-text"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-atseen-line bg-atseen-surface-2 text-2xl">
                    <FiImage aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold">Add photo</span>
                </button>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
              <div className="absolute left-4 right-4 top-4 flex items-center gap-2">
                <FanAvatar name={currentUser?.name || "You"} size="h-8 w-8" src={currentUser?.avatar} />
                <span className="truncate text-sm font-bold text-white">Your story</span>
              </div>
              {caption.trim() ? (
                <p className="absolute bottom-16 left-4 right-4 rounded-2xl bg-black/35 px-3 py-2 text-center text-base font-bold leading-6 text-white backdrop-blur">
                  {caption.trim()}
                </p>
              ) : null}
            </div>

            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={chooseFile}
              ref={fileInputRef}
              type="file"
            />
            <div className="flex gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[13px] border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm font-bold text-atseen-text transition hover:border-atseen-blue/45"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {draft ? <FiRefreshCw aria-hidden="true" /> : <FiUpload aria-hidden="true" />}
                {draft ? "Replace" : "Upload"}
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-4 py-3 text-sm font-bold text-atseen-bg disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!draft || publishMutation.isPending}
                onClick={publishStory}
                type="button"
              >
                {publishMutation.isPending ? `Uploading ${progress}%` : "Share for 24 hours"}
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-atseen-muted">Caption</span>
              <input
                className="w-full rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm text-atseen-text outline-none transition placeholder:text-atseen-dim focus:border-atseen-blue/60"
                maxLength={140}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Write a caption..."
                value={caption}
              />
            </label>
          </div>
        </FanModal>
      ) : null}

      <FanModal className="max-w-md p-0 sm:p-0" isOpen={Boolean(activeStory)} onClose={closeStory} title={activeStory?.name || "Story"}>
        {activeStory ? (
          <div className="relative h-[min(78vh,620px)] overflow-hidden rounded-[18px]">
            <StoryMedia muted={muted} story={activeStory} />
            <div className="absolute inset-0 bg-gradient-to-b from-atseen-bg/70 via-transparent to-atseen-bg/90" />
            <div className="absolute left-4 right-4 top-4 flex gap-1">
              {activeStories.map((story, index) => (
                <span
                  className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
                  key={story.id}
                >
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-100"
                    style={{ width: `${index < activeIndex ? 100 : index === activeIndex ? progress : 0}%` }}
                  />
                </span>
              ))}
            </div>
            <button
              className="absolute left-4 right-24 top-9 flex items-center gap-2.5 text-left"
              onClick={() => showToast(`${activeStory.name} profile opens from story.`)}
              type="button"
            >
              <FanAvatar brand={activeStory.brand} name={activeStory.name} size="h-9 w-9" src={activeStory.avatar} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-sm font-bold text-white">
                  <span className="truncate">{activeStory.name}</span>
                  {activeStory.verified ? <VerifiedBadge className="h-3.5 w-3.5 shrink-0" /> : null}
                </span>
                <span className="block truncate text-[10px] font-semibold text-white/65">{activeStory.timeAgo || "Now"}</span>
              </span>
            </button>
            <div className="absolute right-4 top-9 flex gap-2">
              <button
                aria-label={paused ? "Resume story" : "Pause story"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                onClick={() => setPaused((current) => !current)}
                type="button"
              >
                {paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
              </button>
              {activeStory.mediaType === "video" ? (
                <button
                  aria-label={muted ? "Unmute story" : "Mute story"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                  onClick={() => setMuted((current) => !current)}
                  type="button"
                >
                  {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
                </button>
              ) : null}
              {canDeleteStory(user, activeStory) ? (
                <button
                  aria-label="Delete story"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-atseen-danger/70"
                  onClick={deleteOwnStory}
                  type="button"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <p className="absolute bottom-24 left-5 right-5 text-base font-bold leading-7 text-white">{activeStory.caption}</p>
            {recentReaction ? (
              <span
                aria-live="polite"
                className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 animate-bounce text-5xl"
              >
                {recentReaction}
              </span>
            ) : null}
            {user?.role === "fan" ? <div className="absolute bottom-5 left-4 right-4 rounded-full border border-white/10 bg-black/35 p-1.5 backdrop-blur">
              <div className="flex items-center justify-between gap-1">
                {QUICK_REACTIONS.map(({ label, value }) => (
                  <button
                    aria-label={`React with ${label}`}
                    aria-pressed={selectedReaction === value}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
                      selectedReaction === value ? "bg-atseen-blue text-atseen-bg" : "hover:bg-white/15"
                    } ${reactionMutation.isPending ? "cursor-wait opacity-70" : ""}`}
                    disabled={reactionMutation.isPending}
                    key={value}
                    onClick={() => reactToActiveStory(value)}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div> : null}
            <button
              aria-label="Previous story"
              className="absolute bottom-20 left-0 top-20 w-1/3 cursor-default opacity-0"
              disabled={activeIndex === 0}
              onClick={() => goStory(-1)}
              type="button"
            />
            <button
              aria-label="Next story"
              className="absolute bottom-20 right-0 top-20 w-2/3 cursor-default opacity-0"
              disabled={activeIndex === activeStories.length - 1}
              onClick={() => goStory(1)}
              type="button"
            />
          </div>
        ) : null}
      </FanModal>
    </>
  );
}

export default StoriesRow;
