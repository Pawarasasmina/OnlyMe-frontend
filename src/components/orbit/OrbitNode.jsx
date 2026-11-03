/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { memo } from "react";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import OrbitWorldBadge from "./OrbitWorldBadge";

function OrbitNode({ featured = false, isNew = false, node, onOpen, position }) {
  __useUiLanguage();
  const name = node.name || node.username || __msg("discover.creator");
  const firstName = name.split(" ")[0];
  const badge = featured ? { emoji: "\u2726", label: __msg("orbit.today") } : isNew ? { emoji: "\u2726", label: __msg("orbit.new") } : node.worldBadge || node.worldBadges?.[0];

  return (
    <button
      aria-label={__msg("orbit.meet", { value0: name, value1: node.reason || node.reasonDetails?.detail || __msg("onboarding.recommendedForYourOrbit") })}
      className="absolute z-20 w-24 -translate-x-1/2 -translate-y-1/2 text-center transition duration-200 hover:scale-105 focus-visible:scale-105 motion-reduce:transition-none"
      onClick={() => onOpen(node)}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      type="button"
    >
      <span className="relative inline-flex">
        <FanAvatar className={`border-2 shadow-glow ${featured ? "border-atseen-blue" : "border-atseen-blue/45"}`} name={name} size="h-11 w-11 sm:h-12 sm:w-12" src={node.avatar} />
        {node.verified ? <VerifiedBadge className="absolute -right-1 bottom-0" /> : null}
        {isNew && !featured ? <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-atseen-blue text-[9px] font-black text-atseen-bg">✦</span> : null}
      </span>
      <span className="mt-1 block truncate text-[10px] font-bold text-atseen-text drop-shadow">{firstName}</span>
      <span className="mt-1 flex justify-center">
        <OrbitWorldBadge badge={badge} />
      </span>
    </button>
  );
}

export default memo(OrbitNode);
