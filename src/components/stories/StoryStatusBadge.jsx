function StoryStatusBadge({ status }) {
  if (!status?.label && !status?.emoji) return null;
  const statusText = `${status.emoji || ""} ${status.label || ""}`;
  const emoji = statusText.match(/\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?/u)?.[0] || "";
  const fallbackLetter = status.label?.trim().match(/\p{L}/u)?.[0]?.toUpperCase() || "";
  const mark = emoji || fallbackLetter;
  if (!mark) return null;
  const color = status.color || "#9CCBFF";
  return (
    <span
      aria-label={status.label ? `Status ${status.label}` : "Status"}
      className="wall-story-status-badge"
      style={{ "--story-status-color": color }}
    >
      <span aria-hidden="true">{mark}</span>
    </span>
  );
}

export default StoryStatusBadge;

