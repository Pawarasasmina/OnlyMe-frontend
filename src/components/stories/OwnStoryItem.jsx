/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiPlus } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import StoryPresenceLabel from "./StoryPresenceLabel";

function OwnStoryItem({ activeStatus, hasStories, hasUnseen = false, onAdd, onOpen, onStatus, storyCount = 0, user }) {
  __useUiLanguage();
  const label = hasStories ? __msg("stories.viewYourStoryValue0ItemValue1", { value0: storyCount, value1: storyCount === 1 ? "" : "s" }) : __msg("activity.addToYourStory");
  return (
    <div className="wall-story-item wall-story-own-story">
      <button aria-label={label} className="wall-story-button" onClick={hasStories ? onOpen : onAdd} type="button">
        <span className={`wall-story-ring ${hasStories ? "presence-live-ring" : ""} ${hasStories ? hasUnseen ? "wall-story-ring-unseen" : "wall-story-ring-viewed" : "wall-story-ring-empty"}`}>
          <span className="wall-story-avatar-shell">
            <FanAvatar alt={__msg("stories.yourAvatar")} name={user?.name || "You"} size="h-full w-full" src={user?.avatar || user?.avatarUrl} />
          </span>
        </span>
        <span className="wall-story-name">{__msg("stories.yourStory")}</span>
        <StoryPresenceLabel status={activeStatus || (!hasStories ? { label: __msg("stories.addStory"), color: "rgba(255,255,255,.62)", expiresAt: new Date(Date.now() + 1000).toISOString() } : null)} />
      </button>
      <button aria-label={__msg("stories.createStatus")} className="wall-story-add-badge" onClick={onStatus} type="button">
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}

export default OwnStoryItem;

