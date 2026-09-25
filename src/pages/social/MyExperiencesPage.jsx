import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiLock } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import { profileService } from "../../services/profileService";
import { publicationService } from "../../services/publicationService";

const STAR = "✦";

function updatedLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value || Date.now()).getTime()) / 86400000));
  return days < 1 ? "upd today" : `upd ${days}d`;
}

function ownerDestination(item) {
  return item.status === "PUBLISHED" ? `/experience/${item.id}` : `/studio/experiences/${item.id}/edit`;
}

export default function MyExperiencesPage() {
  const navigate = useNavigate();
  const { username = "" } = useParams();
  const owner = !username;
  const query = useQuery({
    queryKey: ["profile-experiences", owner ? "me" : username],
    queryFn: async () => {
      if (!owner) {
        const response = await profileService.getExperiences(username);
        return response.data.data;
      }
      const response = await publicationService.listMyPublications({ kind: "EXPERIENCE", limit: 50 });
      const items = response.data.data.items || [];
      const details = await Promise.allSettled(items.map((item) => publicationService.getMyPublication(item.id)));
      return {
        creator: null,
        items: items.map((item, index) => ({
          ...item,
          chapters: details[index].status === "fulfilled"
            ? details[index].value.data.data.publication?.chapters || []
            : [],
        })),
      };
    },
    retry: false,
  });

  const items = query.data?.items || [];
  const free = items.filter((item) => item.pricing?.mode === "FREE");
  const paid = items.filter((item) => item.pricing?.mode !== "FREE");
  const destination = (item) => owner ? ownerDestination(item) : `/experience/${item.id}`;
  const title = owner ? "My Experiences" : `${query.data?.creator?.name || "Creator"}'s Experiences`;

  return <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-xl px-5 py-5 text-white">
    <header className="flex items-center gap-3">
      <button aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
      <h1 className="text-xl font-black">{title}</h1>
    </header>
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-[#b9d9ff]">Chapters of your life · {items.length}</p>
      {owner ? <Link className="text-xs font-black text-[#8fc3ff]" to="/create/experience">New +</Link> : null}
    </div>
    {query.isLoading ? <p className="mt-12 text-center text-sm text-white/40">Loading Experiences…</p> : null}
    {query.isError ? <p className="mt-12 text-center text-sm text-red-300">Unable to load Experiences.</p> : null}

    <section className="mt-3">
      {free.map((item) => <Link className="flex items-center gap-3 border-b border-white/10 py-3" key={item.id} to={destination(item)}>
        <span className="h-14 w-14 flex-none overflow-hidden rounded-xl bg-white/5">{item.coverMedia?.secureUrl ? <img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : <span className="grid h-full place-items-center text-[#8fc3ff]">{STAR}</span>}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.title || "Untitled Experience"}</b><small className="mt-1 block text-[10px] text-white/40">{item.chapterCount || item.chapters?.length || 0} chapters · {item.category || "Lifestyle"}</small></span>
        <strong className="text-xs text-white/40">Free</strong>
      </Link>)}
    </section>

    <section className="mt-3 space-y-4">
      {paid.map((item) => <article className="overflow-hidden rounded-2xl border border-[#8fc3ff]/30 bg-[#1b222c] shadow-[0_12px_30px_rgba(0,0,0,.25)]" key={item.id}>
        <Link className="relative block h-56 overflow-hidden bg-[#111722]" to={destination(item)}>
          {item.coverMedia?.secureUrl ? <img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : <span className="grid h-full place-items-center text-5xl text-[#8fc3ff]">{STAR}</span>}
          <b className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px]">{STAR} {Number(item.pricing?.starsAmount || 0).toLocaleString()} · one-time</b>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-14"><strong className="block text-base">{item.title || "Untitled Experience"}</strong><small className="mt-1 block text-[10px]">{item.chapterCount || item.chapters?.length || 0} chapters · {item.category || "Lifestyle"} · {updatedLabel(item.updatedAt)}</small></span>
        </Link>
        <div className="px-4 py-3">
          {(item.chapters || []).slice(0, 2).map((chapter, index) => <div className="flex items-center gap-3 py-1 text-xs" key={chapter.id || chapter.stableChapterId || index}><b className="w-4 text-[10px] text-[#8fc3ff]">{String(index + 1).padStart(2, "0")}</b><span className="min-w-0 flex-1 truncate text-white/75">{chapter.title || `Chapter ${index + 1}`}</span>{chapter.isPreview ? <small className="text-[8px] font-black text-emerald-400">FREE</small> : <FiLock className="text-[10px] text-white/35" />}</div>)}
          {(item.chapters || []).length > 2 ? <p className="ml-7 mt-1 text-[10px] text-white/35">+{item.chapters.length - 2} more inside</p> : null}
          <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] text-white/40"><i className="flex"><b className="h-4 w-4 rounded-full border border-black bg-[#29313c]" /><b className="-ml-1 h-4 w-4 rounded-full border border-black bg-[#202731]" /></i>{Number(item.ownerCount || 0).toLocaleString()} unlocked</span><Link className="flex items-center text-xs font-black text-[#8fc3ff]" to={destination(item)}>Open <FiChevronRight /></Link></div>
        </div>
      </article>)}
    </section>

    {!query.isLoading && !items.length ? owner
      ? <Link className="mt-10 flex justify-center rounded-2xl border border-dashed border-[#8fc3ff]/30 py-6 text-sm font-black text-[#8fc3ff]" to="/create/experience">Create your first Experience +</Link>
      : <p className="mt-12 text-center text-sm text-white/40">No Experiences yet.</p>
      : null}
  </main>;
}
