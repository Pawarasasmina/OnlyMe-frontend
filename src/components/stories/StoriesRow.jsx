import { useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useActiveStories } from "../../hooks/useStories";
import { canCreateStory, getStoryOwnerId, getUserId } from "../../utils/storyPermissions";
import StoryCreator from "./StoryCreator";
import StoryItem from "./StoryItem";
import StoryViewer from "./StoryViewer";

function groupStories(stories, user) {
  const userId = getUserId(user);
  const canUserCreate = canCreateStory(user);
  const groups = [];
  const byOwner = new Map();

  stories.forEach((story) => {
    const isOwnStory = Boolean(story.isOwner || story.isOwn);
    const ownerId = isOwnStory && userId ? userId : getStoryOwnerId(story) || story.owner?.username || story.username || story.id;
    const isOwn = Boolean(canUserCreate && (story.isOwner || story.isOwn || (userId && ownerId === userId)));
    const displayStory = isOwn ? story : { ...story, isOwner: false, isOwn: false };

    if (!byOwner.has(ownerId)) {
      byOwner.set(ownerId, {
        id: ownerId,
        isOwn,
        owner: { ...story.owner, brand: story.brand },
        statusEmoji: story.statusEmoji,
        stories: [],
      });
      groups.push(byOwner.get(ownerId));
    }

    const group = byOwner.get(ownerId);
    group.isOwn = group.isOwn || isOwn;
    group.stories.push(displayStory);
  });

  groups.forEach((group) => {
    group.stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    group.firstUnseenIndex = group.stories.findIndex((story) => !story.viewed);
  });

  return groups.sort((a, b) => Number(b.isOwn) - Number(a.isOwn));
}

function userOwner(currentUser, user) {
  return {
    id: getUserId(user) || "me",
    name: currentUser?.name || user?.name || user?.displayName || "You",
    username: user?.username || "you",
    avatar: currentUser?.avatar || user?.avatar || user?.profileImage || "",
    verified: Boolean(user?.verified),
    role: user?.role,
  };
}

function StoriesRow({ currentUser }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const canCreate = canCreateStory(user);
  const storiesQuery = useActiveStories();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewer, setViewer] = useState({ groupId: null, index: 0 });

  const activeStories = useMemo(() => (Array.isArray(storiesQuery.data) ? storiesQuery.data : []), [storiesQuery.data]);
  const groups = useMemo(() => groupStories(activeStories, user), [activeStories, user]);
  const ownGroup = groups.find((group) => group.isOwn);
  const visibleGroups = canCreate ? groups : groups.filter((group) => !group.isOwn);
  const activeGroup = groups.find((group) => group.id === viewer.groupId);

  const openCreator = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }
    setCreatorOpen(true);
  };

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

  if (!visibleGroups.length && !canCreate) {
    return (
      <div className="mt-[18px] rounded-2xl border border-atseen-line bg-atseen-surface p-4 text-sm font-semibold text-atseen-muted" role="status">
        No active Stories right now.
      </div>
    );
  }

  return (
    <>
      <div className="atseen-hide-scrollbar mt-[18px] flex gap-[18px] overflow-x-auto pb-1">
        {canCreate && !ownGroup ? (
          <StoryItem
            canAdd
            hasUnseen={false}
            isOwn
            label="Add Story"
            onAdd={openCreator}
            onOpen={openCreator}
            owner={userOwner(currentUser, user)}
          />
        ) : null}
        {visibleGroups.map((group) => (
          <StoryItem
            canAdd={canCreate && group.isOwn}
            hasUnseen={group.stories.some((story) => !story.viewed)}
            isOwn={group.isOwn}
            key={group.id}
            label={`View ${group.isOwn ? "your" : group.owner.name + "'s"} Story`}
            onAdd={openCreator}
            onOpen={() => setViewer({ groupId: group.id, index: group.firstUnseenIndex >= 0 ? group.firstUnseenIndex : 0 })}
            owner={group.owner}
            statusEmoji={group.statusEmoji}
          />
        ))}
      </div>

      <StoryCreator
        isOpen={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onPublished={(story) => {
          setCreatorOpen(false);
          setViewer({ groupId: getStoryOwnerId(story) || story.owner?.id, index: Math.max(0, (ownGroup?.stories.length || 1) - 1) });
        }}
      />
      <StoryViewer
        initialIndex={viewer.index}
        isOpen={Boolean(activeGroup)}
        onAddStory={openCreator}
        onClose={() => setViewer({ groupId: null, index: 0 })}
        stories={activeGroup?.stories || []}
      />
    </>
  );
}

export default StoriesRow;
