import { FiBookmark, FiEye, FiMessageCircle, FiMoreHorizontal, FiShare2, FiZap } from "react-icons/fi";

function RailButton({ active = false, children, disabled = false, icon: Icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className={`discover-rail-action ${active ? "is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span>{Icon ? <Icon aria-hidden="true" /> : children}</span>
      <i>{label}</i>
    </button>
  );
}

function DiscoverActionRail({
  actions,
  creatorName,
  onMessage,
  onMore,
  onSave,
  onSeeYou,
  onShare,
  pending = {},
}) {
  const messageLabel = actions.directAccessRequired ? "Direct" : "Message";
  return (
    <div className="discover-action-rail" aria-label={`Actions for ${creatorName}`}>
      <RailButton active={actions.hasSeenSignal} disabled={actions.hasSeenSignal || pending.seeYou} icon={FiEye} label={actions.hasSeenSignal ? "Seen" : "I see you"} onClick={onSeeYou} />
      <RailButton active={actions.saved} disabled={pending.save || !actions.saveTarget} icon={FiBookmark} label={actions.saved ? "Saved" : "Save"} onClick={onSave} />
      <RailButton disabled={pending.message || (!actions.messageAllowed && !actions.directAccessAvailable)} icon={actions.directAccessRequired ? FiZap : FiMessageCircle} label={messageLabel} onClick={onMessage} />
      <RailButton icon={FiShare2} label="Share" onClick={onShare} />
      <RailButton icon={FiMoreHorizontal} label="More" onClick={onMore} />
    </div>
  );
}

export default DiscoverActionRail;
