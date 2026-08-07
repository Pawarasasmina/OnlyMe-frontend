import { FiPlus } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import StoryPresenceLabel from "./StoryPresenceLabel";

function OwnStoryItem({ activeStatus, hasStories, onAdd, onOpen, storyCount = 0, user }) {
  const label = hasStories ? `View your story, ${storyCount} item${storyCount === 1 ? "" : "s"}` : "Add to your story";
  return (
    <div className="wall-story-item wall-story-own-story">
      <button aria-label={label} className="wall-story-button" onClick={hasStories ? onOpen : onAdd} type="button">
        <span className={`wall-story-ring ${hasStories ? "wall-story-ring-unseen" : "wall-story-ring-empty"}`}>
          <span className="wall-story-avatar-shell">
            <FanAvatar alt="Your avatar" name={user?.name || "You"} size="h-full w-full" src={user?.avatar || user?.avatarUrl} />
          </span>
        </span>
        <span className="wall-story-name">Your story</span>
        <StoryPresenceLabel status={activeStatus || (!hasStories ? { label: "Add story", color: "rgba(255,255,255,.62)", expiresAt: new Date(Date.now() + 1000).toISOString() } : null)} />
      </button>
      <button aria-label="Add Story" className="wall-story-add-badge" onClick={onAdd} type="button">
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}

export default OwnStoryItem;

