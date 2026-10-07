import SeenEyeMark from "../branding/SeenEyeMark";

function OwnSeenPresenceItem({ activeStatus, onOpen }) {
  return (
    <button
      aria-current={activeStatus ? "true" : undefined}
      aria-label="View the @seen story"
      className="wall-story-item wall-story-button own-seen-presence"
      onClick={onOpen}
      type="button"
    >
      <span className="wall-story-ring wall-story-ring-own-seen">
        <span className="wall-story-eye-surface">
          <SeenEyeMark className="wall-story-eye-icon" />
        </span>
      </span>
      <span className="wall-story-name wall-story-name-muted">seen ✓</span>
    </button>
  );
}

export default OwnSeenPresenceItem;
