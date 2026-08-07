import { useState } from "react";
import { FiEdit3, FiImage, FiLayers, FiPenTool } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { useWallStories } from "../../../hooks/useStories";
import { canCreateStory } from "../../../utils/storyPermissions";
import { canCreateFeedPost } from "../../../utils/postPermissions";
import FeedPostComposer from "../../posts/FeedPostComposer";
import StatusPicker from "../../stories/StatusPicker";

const createOptions = [
  { label: "Seen", description: "A quick public note for the feed.", icon: FiPenTool },
  { label: "Story", description: "A temporary moment for your orbit.", icon: FiImage, requiresStoryPermission: true },
  { label: "Home", description: "A longer note, ask, or useful sighting.", icon: FiEdit3, requiresFeedPostPermission: true },
  { label: "World", description: "A chaptered experience people can step into.", icon: FiLayers },
];

function PostComposer({ currentUser, onStatusChange, status }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const [postingOpen, setPostingOpen] = useState(false);
  const [feedComposerOpen, setFeedComposerOpen] = useState(false);
  const canPostToHome = canCreateFeedPost(user);
  const viewerId = user?.id || user?._id;
  const wallStoriesQuery = useWallStories({ fallbackUser: { ...currentUser, ...user }, viewerId });
  const activeStatus = wallStoriesQuery.data?.viewer?.activeStatus || user?.activeStatus || null;
  const visibleCreateOptions = createOptions.filter((option) => {
    if (option.requiresStoryPermission) return canCreateStory(user);
    if (option.requiresFeedPostPermission) return canPostToHome;
    return true;
  });

  return (
    <>
      <div className="home-composer-trigger">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => {
            if (!canPostToHome) {
              showToast("Home post creation is only available for creator accounts.");
              return;
            }
            setFeedComposerOpen(true);
          }}
          type="button"
        >
          <FanAvatar name={currentUser.name} size="h-[34px] w-[34px]" src={currentUser.avatar} />
          <span className="truncate">Share what you&apos;ve seen...</span>
        </button>
        <button
          aria-label={activeStatus ? `Change status badge, currently ${activeStatus.label}` : "Set status badge"}
          className={`home-composer-status ${activeStatus ? "" : "is-empty"}`}
          onClick={() => setStatusOpen(true)}
          type="button"
        >
          {activeStatus?.emoji ? <span aria-hidden="true">{activeStatus.emoji}</span> : null}
          {activeStatus?.label || status || "Set status"}
        </button>
      </div>

      <StatusPicker
        activeStatus={activeStatus}
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        onStatusChange={(nextStatusLabel) => {
          onStatusChange?.(nextStatusLabel);
          wallStoriesQuery.refetch();
        }}
      />

      <FanModal isOpen={postingOpen} onClose={() => setPostingOpen(false)} title="Create">
        <p className="text-sm leading-6 text-atseen-muted">
          Choose what you want to make. Desktop creation is staged here; publishing stays connected to the existing product flow.
        </p>
        <div className="mt-4 grid gap-2">
          {visibleCreateOptions.map(({ description, icon: Icon, label }) => (
            <button
              className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left transition hover:border-atseen-blue/45 hover:bg-atseen-blue/10"
              key={label}
              onClick={() => {
                setPostingOpen(false);
                if (label === "Home") {
                  setFeedComposerOpen(true);
                  return;
                }
                showToast(`${label} creation will open here when publishing is enabled.`);
              }}
              type="button"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-atseen-blue/25 bg-atseen-blue/10 text-atseen-blue">
                <Icon aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-atseen-text">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-atseen-muted">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </FanModal>

      <FeedPostComposer currentUser={currentUser} isOpen={feedComposerOpen} onClose={() => setFeedComposerOpen(false)} />
    </>
  );
}

export default PostComposer;
