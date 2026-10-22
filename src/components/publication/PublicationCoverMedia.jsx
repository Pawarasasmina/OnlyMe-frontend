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

export default function PublicationCoverMedia({ alt = "", autoPlay = false, className = "", controls = false, loading, loop = false, media, muted, preload = "metadata" }) {
  const src = resolveMediaUrl(media?.secureUrl || media?.url || media?.playbackUrl || "");
  if (!src) return null;
  if (isVideoCover(media)) {
    const poster = resolveMediaUrl(media?.thumbnailUrl || media?.posterUrl || "") || undefined;
    return <video aria-label={alt || undefined} autoPlay={autoPlay} className={className} controls={controls} loop={loop} muted={muted ?? (autoPlay || !controls)} playsInline poster={poster} preload={preload} src={src} />;
  }
  return <img alt={alt} className={className} loading={loading} src={src} />;
}
