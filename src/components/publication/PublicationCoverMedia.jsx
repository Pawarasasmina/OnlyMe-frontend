import { useRef } from "react";
import { resolveMediaUrl } from "../../utils/media";

function isVideoCover(media) {
  const declaredType = [media?.mediaType, media?.resourceType, media?.type, media?.mimeType, media?.format, media?.assetId, media?.publicId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const source = String(media?.secureUrl || media?.url || media?.playbackUrl || "");
  return declaredType.includes("video")
    || ["mp4", "webm", "mov", "m4v", "ogv"].some((format) => declaredType.split(/\s+/).includes(format))
    || /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(source)
    || Number(media?.durationSeconds ?? media?.duration) > 0;
}

export default function PublicationCoverMedia({ alt = "", autoPlay = false, className = "", controls = false, loading, loop = false, maxPlaybackSeconds = 0, media, muted, preload = "metadata" }) {
  const videoRef = useRef(null);
  const src = resolveMediaUrl(media?.secureUrl || media?.url || media?.playbackUrl || "");
  if (!src) return null;
  if (isVideoCover(media)) {
    const poster = resolveMediaUrl(media?.thumbnailUrl || media?.posterUrl || "") || undefined;
    const onTimeUpdate = (event) => {
      if (!maxPlaybackSeconds || event.currentTarget.currentTime < maxPlaybackSeconds) return;
      if (loop) {
        event.currentTarget.currentTime = 0;
        void event.currentTarget.play().catch(() => {});
      } else event.currentTarget.pause();
    };
    return <video aria-label={alt || undefined} autoPlay={autoPlay} className={className} controls={controls} loop={loop && !maxPlaybackSeconds} muted={muted ?? (autoPlay || !controls)} onTimeUpdate={onTimeUpdate} playsInline poster={poster} preload={preload} ref={videoRef} src={src} />;
  }
  return <img alt={alt} className={className} loading={loading} src={src} />;
}
