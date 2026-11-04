/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiBookmark, FiEye, FiMessageCircle, FiMoreHorizontal, FiShare2, FiZap } from "react-icons/fi";

function RailButton({ active = false, children, disabled = false, icon: Icon, label, onClick }) {
  __useUiLanguage();
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
  __useUiLanguage();
  const messageLabel = actions.directAccessRequired ? __msg("discover.direct") : __msg("discover.message");
  return (
    <div className="discover-action-rail" aria-label={__msg("discover.actionsFor", { value0: creatorName })}>
      <RailButton active={actions.hasSeenSignal} disabled={actions.hasSeenSignal || pending.seeYou} icon={FiEye} label={actions.hasSeenSignal ? "Seen" : __msg("discover.iSeeYou")} onClick={onSeeYou} />
      <RailButton active={actions.saved} disabled={pending.save || !actions.saveTarget} icon={FiBookmark} label={actions.saved ? __msg("contentEntities.saved") : __msg("contentEntities.save_efc007")} onClick={onSave} />
      <RailButton disabled={pending.message || (!actions.messageAllowed && !actions.directAccessAvailable)} icon={actions.directAccessRequired ? FiZap : FiMessageCircle} label={messageLabel} onClick={onMessage} />
      <RailButton icon={FiShare2} label={__msg("admin.share")} onClick={onShare} />
      <RailButton icon={FiMoreHorizontal} label={__msg("discover.more")} onClick={onMore} />
    </div>
  );
}

export default DiscoverActionRail;
