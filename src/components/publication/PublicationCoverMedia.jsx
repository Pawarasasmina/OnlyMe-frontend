import { resolveMediaUrl } from "../../utils/media";

function isVideoCover(media) {
  return media?.mediaType === "VIDEO" || media?.resourceType === "video" || media?.type === "video";
}

export default function PublicationCoverMedia({ alt = "", autoPlay = false, className = "", controls = false, loading, loop = false, media, preload = "metadata" }) {
  const src = resolveMediaUrl(media?.secureUrl || media?.url || "");
  if (!src) return null;
  if (isVideoCover(media)) {
    return <video aria-label={alt || undefined} autoPlay={autoPlay} className={className} controls={controls} loop={loop} muted playsInline preload={preload} src={src} />;
  }
  return <img alt={alt} className={className} loading={loading} src={src} />;
}
