function StoryStatusBadge({ status }) {
  if (!status?.emoji) return null;
  const color = status.color || "#9CCBFF";
  return (
    <span
      aria-label={status.label ? `Status ${status.label}` : "Status"}
      className="wall-story-status-badge"
      style={{ "--story-status-color": color }}
    >
      <span aria-hidden="true">{status.emoji}</span>
    </span>
  );
}

export default StoryStatusBadge;

