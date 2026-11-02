import { useEffect, useRef } from "react";

export default function ActivityContentPreview({ item }) {
  const video = useRef(null);
  const wrapper = useRef(null);
  const image = item.metadata?.imageUrl || item.target?.imageUrl || item.relatedContent?.thumbnailUrl;
  const videoUrl = item.metadata?.videoUrl || item.target?.videoUrl;
  useEffect(() => {
    if (!videoUrl || !video.current) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (!video.current) return;
      if (visible && document.visibilityState === "visible" && !reduced.matches) video.current.play().catch(() => {});
      else video.current.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(wrapper.current);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync); };
  }, [videoUrl]);
  const note = /NOTE|POST/i.test(item.target?.type || "") && (item.target?.preview || item.preview);
  if (!image && !videoUrl && !note) return null;
  return <span className="activity-content-tile" ref={wrapper}>
    {videoUrl ? <video aria-label="Content preview" loop muted playsInline poster={image || undefined} preload="metadata" ref={video} src={videoUrl} /> : image ? <img alt="Content preview" loading="lazy" src={image} /> : <small className="activity-note-tile">{note}</small>}
  </span>;
}
