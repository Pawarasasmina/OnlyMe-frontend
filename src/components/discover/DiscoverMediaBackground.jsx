import { memo, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../utils/media";

function DiscoverMediaBackground({ active, creatorName, media }) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const url = resolveMediaUrl(media?.url || "");
  const poster = resolveMediaUrl(media?.poster || "");
  const showFallback = failed || !url || media?.type === "fallback";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  if (showFallback) {
    return (
      <div aria-hidden="true" className="discover-media-fallback">
        <span>{(creatorName || "A").slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  if (media?.type === "video") {
    return (
      <video
        aria-label={media.alt || `${creatorName} public video`}
        className="discover-media"
        loop
        muted
        onError={() => setFailed(true)}
        playsInline
        poster={poster || undefined}
        preload={active ? "auto" : "metadata"}
        ref={videoRef}
        src={url}
      />
    );
  }

  return (
    <img
      alt={media?.alt || `${creatorName} public media`}
      className="discover-media"
      loading={active ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      src={url}
    />
  );
}

export default memo(DiscoverMediaBackground);
