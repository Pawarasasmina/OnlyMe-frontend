import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../utils/media";
import { readVideoDataSaver, VIDEO_DATA_SAVER_EVENT } from "../../utils/videoDelivery";

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
  __useUiLanguage();
  const videoRef = useRef(null);
  const [mobileData, setMobileData] = useState(readVideoDataSaver);
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => setMobileData(readVideoDataSaver() || Boolean(connection && (connection.type === "cellular" || ["slow-2g", "2g", "3g"].includes(connection.effectiveType) || connection.saveData)));
    update(); connection?.addEventListener?.("change", update); window.addEventListener(VIDEO_DATA_SAVER_EVENT, update);
    return () => { connection?.removeEventListener?.("change", update); window.removeEventListener(VIDEO_DATA_SAVER_EVENT, update); };
  }, []);
  const src = resolveMediaUrl((mobileData && media?.mobileDataUrl) || media?.secureUrl || media?.url || media?.playbackUrl || "");
  if (!src) return null;
  if (isVideoCover(media)) {
    const poster = resolveMediaUrl(media?.thumbnailUrl || media?.posterUrl || "") || undefined;
    const previewSeconds = maxPlaybackSeconds || (autoPlay && loop ? 6 : 0);
    const onTimeUpdate = (event) => {
      if (!previewSeconds || event.currentTarget.currentTime < previewSeconds) return;
      if (loop) {
        event.currentTarget.currentTime = 0;
        void event.currentTarget.play().catch(() => {});
      } else event.currentTarget.pause();
    };
    return <video aria-label={alt || undefined} autoPlay={autoPlay} className={className} controls={controls} loop={loop && !previewSeconds} muted={muted ?? (autoPlay || !controls)} onTimeUpdate={onTimeUpdate} playsInline poster={poster} preload={preload} ref={videoRef} src={src} />;
  }
  return <img alt={alt} className={className} loading={loading} src={src} />;
}
