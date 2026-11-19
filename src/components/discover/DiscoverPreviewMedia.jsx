import { useState } from "react";
import PublicationCoverMedia from "../publication/PublicationCoverMedia";
import { SeenNavIcon } from "../social/socialNavItems";
import { resolveMediaUrl } from "../../utils/media";

export default function DiscoverPreviewMedia({ media, sources = [], alt = "" }) {
  const [failed, setFailed] = useState(() => new Set());
  const primaryUrl = media?.secureUrl || media?.url || media?.playbackUrl;
  const poster = media?.thumbnailUrl || media?.posterUrl;
  const candidates = [
    ...(poster ? [{ secureUrl: resolveMediaUrl(poster) }] : []),
    ...(primaryUrl ? [{ ...media, secureUrl: resolveMediaUrl(primaryUrl) }] : []),
    ...sources.filter(Boolean).map(url => ({ secureUrl: resolveMediaUrl(url) })),
  ];
  const candidate = candidates.find(item => !failed.has(item.secureUrl));
  return candidate ? <PublicationCoverMedia key={candidate.secureUrl} media={candidate} alt={alt} muted preload="metadata" onError={() => setFailed(current => new Set([...current, candidate.secureUrl]))}/> : <span className="discover-preview-media-fallback" aria-hidden="true"><SeenNavIcon/></span>;
}
