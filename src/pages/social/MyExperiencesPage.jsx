import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiLock } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import { profileService } from "../../services/profileService";
import { publicationService } from "../../services/publicationService";

const STAR = "✦";

function updatedLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value || Date.now()).getTime()) / 86400000));
  return days < 1 ? __msg("social.updToday") : __msg("profile.updValue0D", { value0: days });
}

function ownerDestination(item) {
  const hasPublishedView = Boolean(item.publishedAt) || ["PUBLISHED", "CHANGES_REQUESTED"].includes(item.status);
  return hasPublishedView ? `/experience/${item.id}` : `/studio/experiences/${item.id}/edit`;
}

export default function MyExperiencesPage() {
  __useUiLanguage();
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
  const title = owner ? __msg("social.myExperiences") : __msg("social.value0SExperiences", { value0: query.data?.creator?.name || __msg("discover.creator") });

  return <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-xl px-5 py-5 text-white">
    <header className="flex items-center gap-3">
      <button aria-label={__msg("discover.back")} className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button>
      <h1 className="text-xl font-black">{title}</h1>
    </header>
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-[#b9d9ff]">{__msg("social.chaptersOfYourLife")} {items.length}</p>
      {owner ? <Link className="text-xs font-black text-[#8fc3ff]" to="/create/experience">{__msg("social.new")}</Link> : null}
    </div>
    {query.isLoading ? <p className="mt-12 text-center text-sm text-white/40">{__msg("social.loadingExperiences")}</p> : null}
    {query.isError ? <p className="mt-12 text-center text-sm text-red-300">{__msg("social.unableToLoadExperiences")}</p> : null}

    <section className="mt-3">
      {free.map((item) => <Link className="flex items-center gap-3 border-b border-white/10 py-3" key={item.id} to={destination(item)}>
        <span className="h-14 w-14 flex-none overflow-hidden rounded-xl bg-white/5">{item.coverMedia?.secureUrl ? <img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : <span className="grid h-full place-items-center text-[#8fc3ff]">{STAR}</span>}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.title || __msg("profile.untitledExperience")}</b><small className="mt-1 block text-[10px] text-white/40">{item.chapterCount || item.chapters?.length || 0} {__msg("profile.chapters_7790c6")} {item.category || __msg("profile.lifestyle")}</small></span>
        <strong className="text-xs text-white/40">{__msg("profile.free")}</strong>
      </Link>)}
    </section>

    <section className="mt-3 space-y-4">
      {paid.map((item) => <article className="overflow-hidden rounded-2xl border border-[#8fc3ff]/30 bg-[#1b222c] shadow-[0_12px_30px_rgba(0,0,0,.25)]" key={item.id}>
        <Link className="relative block h-56 overflow-hidden bg-[#111722]" to={destination(item)}>
          {item.coverMedia?.secureUrl ? <img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : <span className="grid h-full place-items-center text-5xl text-[#8fc3ff]">{STAR}</span>}
          <b className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px]">{STAR} {Number(item.pricing?.starsAmount || 0).toLocaleString(__uiLocale())} {__msg("profile.oneTime")}</b>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-14"><strong className="block text-base">{item.title || __msg("profile.untitledExperience")}</strong><small className="mt-1 block text-[10px]">{item.chapterCount || item.chapters?.length || 0} {__msg("profile.chapters_7790c6")} {item.category || __msg("profile.lifestyle")} · {updatedLabel(item.updatedAt)}</small></span>
        </Link>
        <div className="px-4 py-3">
          {(item.chapters || []).slice(0, 2).map((chapter, index) => <div className="flex items-center gap-3 py-1 text-xs" key={chapter.id || chapter.stableChapterId || index}><b className="w-4 text-[10px] text-[#8fc3ff]">{String(index + 1).padStart(2, "0")}</b><span className="min-w-0 flex-1 truncate text-white/75">{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</span>{chapter.isPreview ? <small className="text-[8px] font-black text-emerald-400">{__msg("social.free")}</small> : <FiLock className="text-[10px] text-white/35" />}</div>)}
          {(item.chapters || []).length > 2 ? <p className="ms-7 mt-1 text-[10px] text-white/35">+{item.chapters.length - 2} {__msg("social.moreInside")}</p> : null}
          <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] text-white/40"><i className="flex"><b className="h-4 w-4 rounded-full border border-black bg-[#29313c]" /><b className="-ms-1 h-4 w-4 rounded-full border border-black bg-[#202731]" /></i>{Number(item.ownerCount || 0).toLocaleString(__uiLocale())} {__msg("social.unlocked")}</span><Link className="flex items-center text-xs font-black text-[#8fc3ff]" to={destination(item)}>{__msg("fan.open")} <FiChevronRight data-ui-directional="true" /></Link></div>
        </div>
      </article>)}
    </section>

    {!query.isLoading && !items.length ? owner
      ? <Link className="mt-10 flex justify-center rounded-2xl border border-dashed border-[#8fc3ff]/30 py-6 text-sm font-black text-[#8fc3ff]" to="/create/experience">{__msg("social.createYourFirstExperience")}</Link>
      : <p className="mt-12 text-center text-sm text-white/40">{__msg("social.noExperiencesYet")}</p>
      : null}
  </main>;
}
