/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import SeenEyeMark from "../branding/SeenEyeMark";

function OwnSeenPresenceItem({ activeStatus, onOpen }) {
  __useUiLanguage();
  return (
    <button
      aria-current={activeStatus ? "true" : undefined}
      aria-label={__msg("stories.viewTheSeenStory")}
      className="wall-story-item wall-story-button own-seen-presence"
      onClick={onOpen}
      type="button"
    >
      <span className="wall-story-ring wall-story-ring-own-seen">
        <span className="wall-story-eye-surface">
          <SeenEyeMark className="wall-story-eye-icon" />
        </span>
      </span>
      <span className="wall-story-name wall-story-name-muted">{__msg("stories.seen")}</span>
    </button>
  );
}

export default OwnSeenPresenceItem;
