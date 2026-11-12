/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import StoryPresenceLabel from "./StoryPresenceLabel";
import StoryStatusBadge from "./StoryStatusBadge";

function readableName(user = {}) {
  return user.firstName || user.name?.split(" ").filter(Boolean)[0] || user.username || __msg("layouts.account");
}

function WallStoryPersonItem({ group, onOpenStory }) {
  __useUiLanguage();
  const hasStories = group.stories.length > 0;
  const name = readableName(group.user);
  const viewed = hasStories && !group.hasUnseenStories;
  const label = __msg("stories.viewValue0SStoryValue1Value2", { value0: name, value1: group.hasUnseenStories ? "unseen" : "viewed", value2: group.activeStatus?.label ? `, status ${group.activeStatus.label}` : "" });

  return (
    <button
      aria-label={label}
      className={`wall-story-item wall-story-button ${viewed ? "is-viewed" : ""}`}
      onClick={onOpenStory}
      type="button"
    >
      <span className={`wall-story-ring ${hasStories ? "presence-live-ring" : ""} ${hasStories ? group.hasUnseenStories ? "wall-story-ring-unseen" : "wall-story-ring-viewed" : "wall-story-ring-status"}`} style={{ "--story-status-color": group.activeStatus?.color || "#9CCBFF" }}>
        <span className="wall-story-avatar-shell">
          <FanAvatar alt={__msg("fan.avatar", { value0: group.user.name || name })} name={group.user.name || name} size="h-full w-full" src={group.user.avatar || group.user.avatarUrl} />
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
