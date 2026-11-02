function StoryStatusBadge({ status }) {
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
      aria-label={status.label ? `Status ${status.label}` : "Status"}
      className="wall-story-status-badge is-online"
      style={{ "--story-status-color": color }}
    >
      <span className="sr-only">Online</span>
    </span>
  );
}

export default StoryStatusBadge;

