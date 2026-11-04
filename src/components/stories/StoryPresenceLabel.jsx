import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function StoryPresenceLabel({ status }) {
  __useUiLanguage();
  if (!status?.label) return null;
  const label = status.label
    .replace(/^\s*\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?)*\s*/u, "")
    .trim();
  if (!label) return null;
  return (
    <span className="wall-story-presence-label">
      {label}
    </span>
  );
}

export default StoryPresenceLabel;

