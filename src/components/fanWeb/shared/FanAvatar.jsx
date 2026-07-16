import { useState } from "react";
import AtseenLogo from "../../branding/AtseenLogo";
import { resolveMediaUrl } from "../../../utils/media";

function initials(name = "Atseen") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function FanAvatar({ alt, brand = false, className = "", name = "Atseen", src, size = "h-11 w-11" }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = src ? resolveMediaUrl(src) : "";

  return (
    <span className={`${size} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-atseen-surface-2 text-atseen-blue ${className}`}>
      {brand ? <AtseenLogo iconOnly size={24} /> : null}
      {!brand && imageUrl && !failed ? (
        <img
          alt={alt || `${name} avatar`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          src={imageUrl}
        />
      ) : null}
      {!brand && (!imageUrl || failed) ? <span className="text-xs font-bold">{initials(name)}</span> : null}
    </span>
  );
}

export default FanAvatar;
