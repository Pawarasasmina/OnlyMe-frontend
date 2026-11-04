/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useState } from "react";
import AtseenLogo from "../../branding/AtseenLogo";
import { resolveMediaUrl } from "../../../utils/media";

function initials(name = __msg("branding.atseen")) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function FanAvatar({ alt, brand = false, className = "", name = __msg("branding.atseen"), src, size = "h-11 w-11" }) {
  __useUiLanguage();
  const [failed, setFailed] = useState(false);
  const imageUrl = src ? resolveMediaUrl(src) : "";

  return (
    <span className={`fan-avatar ${size} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-atseen-surface-2 text-atseen-blue ${className}`}>
      {brand ? <AtseenLogo iconOnly size={24} /> : null}
      {!brand && imageUrl && !failed ? (
        <img
          alt={alt || __msg("fan.avatar", { value0: name })}
          className="h-full w-full object-cover object-[center_35%]"
          onError={() => setFailed(true)}
          src={imageUrl}
        />
      ) : null}
      {!brand && (!imageUrl || failed) ? <span className="text-xs font-bold">{initials(name)}</span> : null}
    </span>
  );
}

export default FanAvatar;
