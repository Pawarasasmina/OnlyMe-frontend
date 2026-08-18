import { useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useWallStories } from "../../hooks/useStories";
import { canCreateStory, getStoryOwnerId, getUserId } from "../../utils/storyPermissions";
import OfficialSeenStoryViewer from "./OfficialSeenStoryViewer";
import OwnSeenPresenceItem from "./OwnSeenPresenceItem";
import OwnStoryItem from "./OwnStoryItem";
import StoryCreator from "./StoryCreator";
import StoryStripSkeleton from "./StoryStripSkeleton";
import StoryViewer from "./StoryViewer";
import WallStoryPersonItem from "./WallStoryPersonItem";

function ownUser(currentUser, user, viewer) {
  return {
    activeStatus: viewer?.activeStatus || user?.activeStatus || null,
    avatar: viewer?.avatar || viewer?.avatarUrl || currentUser?.avatar || user?.avatar || user?.profileImage || "",
    id: viewer?.id || getUserId(user) || "me",
    name: viewer?.name || currentUser?.name || user?.name || user?.displayName || "You",
    username: viewer?.username || user?.username || "you",
    verified: Boolean(viewer?.verified || user?.verified || user?.isVerified),
  };
}

function StoriesRow({ currentUser }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const canCreate = canCreateStory(user);
  const showStoryPublishing = canCreate;
  const viewerId = getUserId(user);
  const storiesQuery = useWallStories({ fallbackUser: { ...currentUser, ...user }, viewerId });
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [seenStoryOpen, setSeenStoryOpen] = useState(false);
  const [viewer, setViewer] = useState({ groupId: null, index: 0 });

  const wallData = storiesQuery.data || { items: [], viewer: ownUser(currentUser, user) };
  const me = ownUser(currentUser, user, wallData.viewer);
  const ownStories = useMemo(() => (wallData.viewer?.stories || []).map((story) => ({ ...story, isOwn: true, isOwner: true })), [wallData.viewer?.stories]);
  const peopleGroups = useMemo(() => (
    wallData.items || []
  ).filter((group) => String(group.user?.id || "") !== String(me.id || "") && (group.stories || []).length > 0), [me.id, wallData.items]);

  const activeGroup = useMemo(() => {
    if (viewer.groupId === "own") return { id: "own", stories: ownStories };
    return peopleGroups.find((group) => group.id === viewer.groupId || group.user?.id === viewer.groupId);
  }, [ownStories, peopleGroups, viewer.groupId]);

  const openCreator = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }
    setCreatorOpen(true);
  };

  const openOwnStory = () => {
    if (!ownStories.length) {
      openCreator();
      return;
    }
    const index = ownStories.findIndex((story) => !story.viewed);
    setViewer({ groupId: "own", index: index >= 0 ? index : 0 });
  };

  if (storiesQuery.isLoading && !storiesQuery.data) {
    return <StoryStripSkeleton />;
  }

  return (
    <>
      <div className="wall-story-strip atseen-hide-scrollbar" aria-label="Home stories and statuses">
        <OwnSeenPresenceItem activeStatus={me.activeStatus} onOpen={() => setSeenStoryOpen(true)} />
        {showStoryPublishing ? (
          <OwnStoryItem
            activeStatus={me.activeStatus}
            hasStories={ownStories.length > 0}
            onAdd={openCreator}
            onOpen={openOwnStory}
            storyCount={ownStories.length}
            user={me}
          />
        ) : null}
        {storiesQuery.isError ? (
          <button className="wall-story-error" onClick={() => storiesQuery.refetch()} type="button">
            <FiRefreshCw aria-hidden="true" />
            Retry
          </button>
        ) : null}
        {!storiesQuery.isError && peopleGroups.map((group) => {
          const firstUnseenIndex = group.stories.findIndex((story) => !story.viewed);
          return (
            <WallStoryPersonItem
              group={group}
              key={group.id || group.user.id}
              onOpenStory={() => setViewer({ groupId: group.id || group.user.id, index: firstUnseenIndex >= 0 ? firstUnseenIndex : 0 })}
            />
          );
        })}
      </div>

      <OfficialSeenStoryViewer isOpen={seenStoryOpen} onClose={() => setSeenStoryOpen(false)} />
      {showStoryPublishing ? (
        <StoryCreator
          isOpen={creatorOpen}
          onClose={() => setCreatorOpen(false)}
          onPublished={(story) => {
            setCreatorOpen(false);
            const ownerId = getStoryOwnerId(story);
            if (ownerId && String(ownerId) !== String(me.id)) return;
            storiesQuery.refetch();
          }}
        />
      ) : null}
      <StoryViewer
        initialIndex={viewer.index}
        isOpen={Boolean(activeGroup?.stories?.length)}
        onAddStory={showStoryPublishing ? openCreator : undefined}
        onClose={() => setViewer({ groupId: null, index: 0 })}
        stories={activeGroup?.stories || []}
      />
    </>
  );
}

export default StoriesRow;
