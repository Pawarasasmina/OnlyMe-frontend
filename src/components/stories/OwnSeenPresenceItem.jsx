function EyeIcon() {
  return (
    <svg aria-hidden="true" className="wall-story-eye-icon" fill="none" viewBox="0 0 48 32">
      <path d="M4 16s7.2-11 20-11 20 11 20 11-7.2 11-20 11S4 16 4 16Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <circle cx="24" cy="16" fill="currentColor" r="4.8" />
    </svg>
  );
}

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
          <EyeIcon />
        </span>
      </span>
      <span className="wall-story-name wall-story-name-muted">seen ✓</span>
    </button>
  );
}

export default OwnSeenPresenceItem;
