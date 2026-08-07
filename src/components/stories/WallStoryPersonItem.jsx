import FanAvatar from "../fanWeb/shared/FanAvatar";
import StoryPresenceLabel from "./StoryPresenceLabel";
import StoryStatusBadge from "./StoryStatusBadge";

function readableName(user = {}) {
  return user.firstName || user.name?.split(" ").filter(Boolean)[0] || user.username || "Account";
}

function WallStoryPersonItem({ group, onOpenStory }) {
  const hasStories = group.stories.length > 0;
  const name = readableName(group.user);
  const viewed = hasStories && !group.hasUnseenStories;
  const label = `View ${name}'s story, ${group.hasUnseenStories ? "unseen" : "viewed"}${group.activeStatus?.label ? `, status ${group.activeStatus.label}` : ""}`;

  return (
    <button
      aria-label={label}
      className={`wall-story-item wall-story-button ${viewed ? "is-viewed" : ""}`}
      onClick={onOpenStory}
      type="button"
    >
      <span className={`wall-story-ring ${hasStories ? group.hasUnseenStories ? "wall-story-ring-unseen" : "wall-story-ring-viewed" : "wall-story-ring-status"}`} style={{ "--story-status-color": group.activeStatus?.color || "#9CCBFF" }}>
        <span className="wall-story-avatar-shell">
          <FanAvatar alt={`${group.user.name || name} avatar`} name={group.user.name || name} size="h-full w-full" src={group.user.avatar || group.user.avatarUrl} />
        </span>
        <StoryStatusBadge status={group.activeStatus} />
      </span>
      <span className="wall-story-name">
        <span className="truncate">{name}</span>
      </span>
      <StoryPresenceLabel status={group.activeStatus} />
    </button>
  );
}

export default WallStoryPersonItem;
