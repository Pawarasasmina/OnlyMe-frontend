function StoryPresenceLabel({ status }) {
  if (!status?.label) return null;
  const label = status.label
    .replace(/^\s*\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?)*\s*/u, "")
    .trim();
  if (!label) return null;
  return (
    <span className="wall-story-presence-label" style={{ color: status.color || "#9CCBFF" }}>
      {label}
    </span>
  );
}

export default StoryPresenceLabel;

