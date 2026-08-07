function StoryPresenceLabel({ status }) {
  if (!status?.label) return null;
  return (
    <span className="wall-story-presence-label" style={{ color: status.color || "#9CCBFF" }}>
      {status.label}
    </span>
  );
}

export default StoryPresenceLabel;

