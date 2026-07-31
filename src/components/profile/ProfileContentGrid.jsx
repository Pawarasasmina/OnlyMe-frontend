import { Link } from "react-router-dom";
import { FiBookOpen, FiFileText, FiHeadphones, FiImage, FiLock, FiVideo } from "react-icons/fi";

const icons = { IMAGE: FiImage, VIDEO: FiVideo, AUDIO: FiHeadphones, TEXT: FiFileText };

function ProfileContentGrid({ content = [], kind = "content" }) {
  if (kind === "seens") {
    if (!content.length) return <div className="rounded-2xl border border-dashed border-atseen-line p-8 text-center"><p className="text-sm font-semibold">No published Seens yet.</p><p className="mt-2 text-xs text-atseen-muted">Drafts and review submissions stay private.</p></div>;
    return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{content.map((item) => <Link className="relative aspect-square overflow-hidden rounded-xl border border-atseen-line bg-atseen-surface" key={item.id} to={`/seen/${item.id}`}>{item.coverMedia?.secureUrl ? <img alt={`${item.title} cover`} className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : <span className="grid h-full place-items-center"><FiBookOpen /></span>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-3"><p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p><p className="text-[10px] text-white/60">{item.chapters?.length || 0} chapters</p></div></Link>)}</div>;
  }
  if (!content.length) return <div className="rounded-2xl border border-dashed border-atseen-line p-8 text-center"><p className="text-sm font-semibold">No published content yet.</p><p className="mt-2 text-xs text-atseen-muted">Only published legacy content appears here.</p></div>;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{content.map((item) => { const Icon = item.locked ? FiLock : icons[item.contentType] || FiFileText; const media = item.media?.find((entry) => entry.isPrimary) || item.media?.[0] || item.thumbnail; const image = !item.locked && media?.mediaType === "IMAGE" ? media.secureUrl : null; return <article className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-atseen-line bg-atseen-surface" key={item.id}>{image ? <img alt="" className="h-full w-full object-cover" src={image} /> : <Icon className="text-3xl text-atseen-blue/60" />}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3"><p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p>{item.locked ? <p className="mt-1 text-[10px] text-atseen-muted">Locked content</p> : null}</div></article>; })}</div>;
}

export default ProfileContentGrid;
