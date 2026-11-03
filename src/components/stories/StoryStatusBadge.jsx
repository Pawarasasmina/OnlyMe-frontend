/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function StoryStatusBadge({ status }) {
  __useUiLanguage();
  if (status?.presetKey !== "at_seen" && String(status?.label || "").toLowerCase() !== "at seen") return null;
  if (!status?.label && !status?.emoji) return null;
  const statusText = `${status.emoji || ""} ${status.label || ""}`;
  const emoji = statusText.match(/\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?/u)?.[0] || "";
  const fallbackLetter = status.label?.trim().match(/\p{L}/u)?.[0]?.toUpperCase() || "";
  const mark = emoji || fallbackLetter;
  if (!mark) return null;
  const color = status.color || "#9CCBFF";
  return (
    <span
      aria-label={status.label ? __msg("stories.status", { value0: status.label }) : __msg("financial.status")}
      className="wall-story-status-badge is-online"
      style={{ "--story-status-color": color }}
    >
      <span className="sr-only">{__msg("discover.online")}</span>
    </span>
  );
}

export default StoryStatusBadge;

