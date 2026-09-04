import { FiEye, FiHeart, FiMessageCircle, FiMoreHorizontal, FiShare2 } from "react-icons/fi";
import { resolveMediaUrl } from "../../utils/media";

function MediaPreview({ media }) {
  const items = Array.isArray(media) ? media : media ? [media] : [];
  if (!items.length) return null;

  return <div className={`mt-4 grid gap-1 overflow-hidden rounded-2xl bg-slate-100 ${items.length > 1 ? "grid-cols-2" : ""}`}>
    {items.slice(0, 4).map((item, index) => {
      const url = resolveMediaUrl(item.url || item.secureUrl);
      const type = String(item.type || item.mediaType || item.resourceType || "").toLowerCase();
      if (!url) return null;
      if (type.includes("audio") || type.includes("voice")) return <audio className="w-full p-3" controls key={`${url}-${index}`} preload="metadata" src={url} />;
      if (type.includes("video")) return <video className="max-h-[480px] w-full bg-black object-contain" controls key={`${url}-${index}`} preload="metadata" src={url} />;
      return <img alt="Reported content" className="max-h-[480px] w-full object-cover" key={`${url}-${index}`} loading="lazy" src={url} />;
    })}
  </div>;
}

export default function PostReportPreview({ report }) {
  const snapshot = report.snapshot || {};
  const owner = report.reportedUser || {};
  const publication = report.publication || {};
  const isSeen = report.scope === "SEEN";
  const title = snapshot.title || publication.title || "Seen";
  const body = isSeen ? (snapshot.summary || publication.summary) : snapshot.text;
  const media = isSeen ? (snapshot.media || snapshot.coverMedia || publication.coverMedia) : snapshot.media;
  const publishedAt = snapshot.publishedAt || snapshot.createdAt || publication.publishedAt;

  return <article className="mx-auto w-full max-w-xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-900 font-black text-white">
        {owner.avatar ? <img alt="" className="h-full w-full object-cover" src={resolveMediaUrl(owner.avatar)} /> : owner.name?.slice(0, 1) || "U"}
      </span>
      <div className="min-w-0 flex-1"><p className="truncate font-black">{owner.name || "Reported user"}</p><p className="truncate text-xs text-slate-500">@{owner.username || "unknown"}{publishedAt ? ` · ${new Date(publishedAt).toLocaleString()}` : ""}</p></div>
      <FiMoreHorizontal className="text-xl text-slate-400" />
    </header>
    <div className="px-4 pb-4">
      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600">{isSeen ? "Seen" : snapshot.context || "Home feed post"}</span>
      {isSeen && <h5 className="mt-3 text-xl font-black tracking-tight">{title}</h5>}
      {body ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-800">{body}</p> : <p className="mt-3 text-sm italic text-slate-400">No written caption</p>}
      <MediaPreview media={media} />
      <div className="mt-4 flex items-center justify-between border-t pt-4 text-slate-500">
        <span className="flex items-center gap-1.5"><FiHeart /> React</span><span className="flex items-center gap-1.5"><FiMessageCircle /> Comment</span><span className="flex items-center gap-1.5"><FiShare2 /> Share</span><span className="flex items-center gap-1.5"><FiEye /> Preview</span>
      </div>
    </div>
    <footer className="border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-500">Captured report evidence · Content ID: {snapshot.postId || snapshot.publicationId || publication._id || "Unavailable"}</footer>
  </article>;
}
