import { FiPlus } from "react-icons/fi";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";

function StoryItem({ canAdd = false, hasUnseen = false, isOwn = false, label, onAdd, onOpen, owner, statusEmoji }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center text-center">
      <button
        aria-label={label || `View ${owner.name}'s Story`}
        className="flex flex-col items-center"
        onClick={onOpen}
        type="button"
      >
        <span className={`inline-flex rounded-full p-[2.5px] ${hasUnseen ? "bg-gradient-to-br from-atseen-blue to-atseen-blue-strong" : "bg-white/15"}`}>
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-atseen-bg bg-atseen-bg-2">
            {owner.brand ? <AtseenLogo iconOnly size={28} /> : <FanAvatar name={owner.name} size="h-full w-full" src={owner.avatar} />}
          </span>
        </span>
        {statusEmoji ? (
          <span className="-mt-3 ml-7 inline-flex h-5 w-5 items-center justify-center rounded-full border border-atseen-blue/35 bg-atseen-bg text-[10px]">
            {statusEmoji}
          </span>
        ) : null}
        <span className="mt-1 flex max-w-16 items-center gap-1 truncate text-[10px] font-semibold text-atseen-muted">
          <span className="truncate">{isOwn ? "You" : owner.name}</span>
          {owner.verified ? <VerifiedBadge className="h-3 w-3 shrink-0" /> : null}
        </span>
      </button>
      {canAdd ? (
        <button
          aria-label="Add Story"
          className="absolute right-1 top-10 flex h-5 w-5 items-center justify-center rounded-full border border-atseen-bg bg-atseen-blue text-[12px] text-atseen-bg shadow-glow"
          onClick={(event) => {
            event.stopPropagation();
            onAdd?.();
          }}
          type="button"
        >
          <FiPlus aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export default StoryItem;
